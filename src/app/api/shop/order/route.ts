import { createPromptPayCharge, omiseEnabled } from "@/lib/shop/omise";
import { closed, pickupLabel, readToken, shopDb } from "@/lib/shop/shop.server";

export const runtime = "nodejs";

type Body = {
  nickname?: unknown;
  slot?: unknown;
  items?: unknown;
  useReward?: unknown;
};

/**
 * รับออร์เดอร์ — ราคาและแต้มคิดใน shop_place_order() จาก shop_menu
 * สิ่งที่เบราว์เซอร์ส่งมาใช้แค่ชื่อเมนูกับจำนวน
 *
 * มี OMISE_SECRET_KEY: ออร์เดอร์เป็น pending + สร้าง charge พร้อมเพย์ที่ Omise
 *   → หน้าเว็บโชว์ QR จาก /api/shop/pay แล้วรอ /api/shop/pay/status หรือ webhook ยืนยัน
 * ไม่มีคีย์: ลูกค้ากด "โอนแล้ว" → ออร์เดอร์ยืนยันทันทีแบบเดิม
 */
export async function POST(req: Request) {
  const db = shopDb();
  if (!db) return closed();

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const nickname = typeof body.nickname === "string" ? body.nickname.trim().slice(0, 30) : "";
  const slot = typeof body.slot === "string" ? body.slot : "";
  const items = Array.isArray(body.items)
    ? body.items
        .filter((i): i is { name: string; qty: number } => typeof i?.name === "string" && Number.isInteger(i?.qty))
        .map((i) => ({ name: i.name, qty: i.qty }))
    : [];
  if (!nickname) return Response.json({ error: "กรอกชื่อเล่นก่อนนะคะ" }, { status: 400 });
  if (!items.length) return Response.json({ error: "ยังไม่ได้เลือกเมนู" }, { status: 400 });

  const gateway = omiseEnabled();
  const { data, error } = await db.rpc("shop_place_order", {
    p_token: readToken(req),
    p_nickname: nickname,
    p_slot: slot,
    p_items: items,
    p_use_reward: body.useReward === true,
    ...(gateway ? { p_pending: true } : {}),
  });
  if (error) {
    // ข้อความจาก raise exception ขึ้นต้นด้วย "shop:" — ไม่ส่งรายละเอียดภายในออกไป
    const known = error.message.startsWith("shop:");
    if (!known) console.error("[shop] place_order:", error.message);
    return Response.json(
      { error: known ? "เมนูหรือเวลารับเปลี่ยนไปแล้ว ลองรีเฟรชแล้วสั่งใหม่" : "ส่งออร์เดอร์ไม่สำเร็จ ลองอีกครั้ง" },
      { status: known ? 409 : 500 },
    );
  }
  const placed = { ...data, pickupLabel: pickupLabel(data.pickupDate) };
  if (!gateway) return Response.json({ ...placed, payment: "manual" });

  // แลกแต้มจนเหลือ 0 บาท — ไม่มีอะไรให้จ่าย ยืนยันเลย
  if (data.total === 0) {
    const { data: paid, error: e } = await db.rpc("shop_confirm_payment", {
      p_order_id: data.orderId,
      p_charge_id: null,
      p_amount: 0,
    });
    if (e) {
      console.error("[shop] confirm free order:", e.message);
      return Response.json({ error: "ส่งออร์เดอร์ไม่สำเร็จ ลองอีกครั้ง" }, { status: 500 });
    }
    return Response.json({ ...placed, ...paid, payment: "omise" });
  }
  // PromptPay ของ Omise รับขั้นต่ำ 20 บาท — ออร์เดอร์ค้าง pending ไว้เฉย ๆ ไม่เข้าสรุป
  if (data.total < 20) {
    return Response.json({ error: "ยอดขั้นต่ำสำหรับจ่ายผ่าน QR คือ 20 บาท" }, { status: 400 });
  }

  try {
    const charge = await createPromptPayCharge(data.total, data.orderId, data.orderNo);
    const { error: e } = await db.from("shop_orders").update({ charge_id: charge.id }).eq("id", data.orderId);
    if (e) throw new Error(e.message);
  } catch (e) {
    console.error("[shop] omise charge:", (e as Error).message);
    return Response.json({ error: "สร้าง QR ไม่สำเร็จ ลองอีกครั้ง" }, { status: 502 });
  }
  return Response.json({ ...placed, payment: "omise" });
}
