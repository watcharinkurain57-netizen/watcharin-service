import { fetchQrImage, getCharge, omiseEnabled } from "@/lib/shop/omise";
import { ownOrder } from "@/lib/shop/pay.server";
import { closed, shopDb } from "@/lib/shop/shop.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * รูป QR พร้อมเพย์ของออร์เดอร์ (จาก Omise) — ใช้เป็น <img src> จึงรับ token ทาง query (?t=)
 * ยอดเงินฝังอยู่ใน QR แล้ว ลูกค้าแก้ยอดเองไม่ได้
 */
export async function GET(req: Request) {
  const db = shopDb();
  if (!db || !omiseEnabled()) return closed();
  const q = new URL(req.url).searchParams;
  const order = await ownOrder(db, q.get("order"), q.get("t"));
  if (!order?.charge_id || order.payment_status !== "pending") {
    return Response.json({ error: "ไม่พบ QR ของออร์เดอร์นี้" }, { status: 404 });
  }
  try {
    const img = await fetchQrImage(await getCharge(order.charge_id));
    if (img) return img;
  } catch (e) {
    console.error("[shop] pay qr:", (e as Error).message);
  }
  return Response.json({ error: "โหลด QR ไม่สำเร็จ" }, { status: 502 });
}
