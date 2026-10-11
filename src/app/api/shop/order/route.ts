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

  const { data, error } = await db.rpc("shop_place_order", {
    p_token: readToken(req),
    p_nickname: nickname,
    p_slot: slot,
    p_items: items,
    p_use_reward: body.useReward === true,
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
  return Response.json({ ...data, pickupLabel: pickupLabel(data.pickupDate) });
}
