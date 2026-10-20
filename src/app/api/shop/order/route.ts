import { lineChannels, lineCustomer, linkLine, readLineToken, verifyLineUser } from "@/lib/shop/line-user.server";
import { notifyLater } from "@/lib/shop/notify.server";
import { createPromptPayCharge, omiseEnabled } from "@/lib/shop/omise";
import { branchSlug, closed, pickupLabel, readToken, shopDb } from "@/lib/shop/shop.server";

export const runtime = "nodejs";

type Body = {
  branch?: unknown;
  nickname?: unknown;
  slot?: unknown;
  items?: unknown;
  useReward?: unknown;
  delivery?: unknown;
};

/** ข้อความสั้น ๆ จากหน้าร้าน (ตัดความยาวไว้ก่อน ฐานข้อมูลเช็กซ้ำอีกที) */
const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/**
 * ที่อยู่ส่งของ — สาขาที่ส่งถึงที่ (shop_branches.delivery) ฐานข้อมูลบังคับที่อยู่ + เบอร์โทร
 * สาขาที่ลูกค้ามารับเอง ฐานข้อมูลไม่สนค่านี้
 */
function readDelivery(v: unknown): { address: string; phone: string; map: string } | null {
  if (!v || typeof v !== "object") return null;
  const d = v as Record<string, unknown>;
  return { address: text(d.address, 600), phone: text(d.phone, 20), map: text(d.map, 40) };
}

/** ข้อความ "shop: ..." จาก shop_place_order() → ข้อความให้ลูกค้า (ไม่ส่งรายละเอียดภายในออกไป) */
function placeError(message: string): { error: string; status: number } {
  if (!message.startsWith("shop:")) return { error: "ส่งออร์เดอร์ไม่สำเร็จ ลองอีกครั้ง", status: 500 };
  if (message.includes("branch closed")) return { error: "สาขานี้ปิดรับออร์เดอร์อยู่", status: 409 };
  if (message.includes("address required")) return { error: "กรอกที่อยู่สำหรับส่งของก่อนนะคะ", status: 400 };
  if (message.includes("invalid phone")) return { error: "เบอร์โทรไม่ถูกต้อง ใส่เบอร์มือถือ 10 หลัก", status: 400 };
  return { error: "เมนูหรือเวลารับเปลี่ยนไปแล้ว ลองรีเฟรชแล้วสั่งใหม่", status: 409 };
}

/**
 * รับออร์เดอร์ — ราคาและแต้มคิดใน shop_place_order() จาก shop_menu
 * สิ่งที่เบราว์เซอร์ส่งมาใช้แค่สาขา ชื่อเมนูกับจำนวน (และที่อยู่ เบอร์โทร ถ้าสาขาส่งถึงที่)
 * วันรับของ รอบเวลารับ และเลขออร์เดอร์ (A1016-03) ตามสาขา คิดในฐานข้อมูลเช่นกัน
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
  const branch = branchSlug(body.branch);
  const nickname = typeof body.nickname === "string" ? body.nickname.trim().slice(0, 30) : "";
  const slot = typeof body.slot === "string" ? body.slot : "";
  const items = Array.isArray(body.items)
    ? body.items
        .filter((i): i is { name: string; qty: number } => typeof i?.name === "string" && Number.isInteger(i?.qty))
        .map((i) => ({ name: i.name, qty: i.qty }))
    : [];
  if (!branch) return Response.json({ error: "ไม่พบสาขา ลองเปิดจากปุ่มในไลน์ร้านอีกครั้ง" }, { status: 400 });
  if (!nickname) return Response.json({ error: "กรอกชื่อเล่นก่อนนะคะ" }, { status: 400 });
  if (!items.length) return Response.json({ error: "ยังไม่ได้เลือกเมนู" }, { status: 400 });

  // สั่งจากปุ่มในไลน์ (LIFF): ใช้บัตรของบัญชีไลน์นี้ · เช็กไม่ผ่าน/ไลน์ไม่ตอบ = ใช้บัตรที่มือถือจำแบบเดิม
  let token = readToken(req);
  const lineToken = readLineToken(req);
  const line = lineToken ? await verifyLineUser(lineToken, await lineChannels(db)) : null;
  /** ไลน์นี้ยังไม่มีบัตร — บัตรที่ shop_place_order สร้างให้ต้องผูกกับไลน์ */
  let linkNew = false;
  if (line) {
    try {
      const found = await lineCustomer(db, line.uid, token);
      if (found) token = found.token;
      else {
        token = null;
        linkNew = true;
      }
    } catch (e) {
      console.error("[shop] order line customer:", (e as Error).message);
    }
  }

  const gateway = omiseEnabled();
  // ตัว 8 พารามิเตอร์ (0029) — สาขาส่งถึงที่เช็กและเก็บที่อยู่ในคำสั่งเดียวกับที่สร้างออร์เดอร์
  const { data, error } = await db.rpc("shop_place_order", {
    p_token: token,
    p_nickname: nickname,
    p_slot: slot,
    p_items: items,
    p_use_reward: body.useReward === true,
    p_pending: gateway,
    p_branch: branch,
    p_delivery: readDelivery(body.delivery),
  });
  if (error) {
    const e = placeError(error.message);
    if (e.status === 500) console.error("[shop] place_order:", error.message);
    return Response.json({ error: e.error }, { status: e.status });
  }
  // ลูกค้าใหม่จากไลน์: ผูกบัตรที่เพิ่งสร้างกับบัญชีไลน์ (เคยผูกแล้ว = ไม่ทำอะไร)
  if (line && linkNew && data.token) await linkLine(db, data.token, line.uid);
  const placed = { ...data, pickupLabel: pickupLabel(data.pickupDate) };
  if (!gateway) {
    // QR ของร้านเอง: ลูกค้ากด "โอนแล้ว" = ออร์เดอร์จ่ายแล้ว → แจ้งเข้าไลน์ (สาขาที่เปิดแจ้งทุกออร์เดอร์)
    notifyLater(db, data.orderId);
    return Response.json({ ...placed, payment: "manual" });
  }

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
    notifyLater(db, data.orderId);
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
