import { BANKS, createBankCharge, enabledBanks, type Bank } from "@/lib/shop/omise";
import { ownOrder } from "@/lib/shop/pay.server";
import { closed, readToken, shopDb } from "@/lib/shop/shop.server";

export const runtime = "nodejs";

/**
 * เปลี่ยนออร์เดอร์ที่รอจ่ายจาก QR เป็นจ่ายผ่านแอปธนาคาร
 * สร้าง charge ใหม่แทนตัว QR (charge_id ของออร์เดอร์ชี้ไปตัวใหม่) แล้วคืนลิงก์ให้หน้าเว็บพาไปเปิด
 * จ่ายเสร็จธนาคารพากลับมาที่ /shop?paid=<order id> ซึ่งอาจเปิดในเบราว์เซอร์อื่นที่ไม่ใช่ในไลน์
 */
export async function POST(req: Request) {
  const db = shopDb();
  if (!db) return closed();
  let body: { order?: unknown; bank?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const bank = BANKS.find((b) => b === body.bank) as Bank | undefined;
  if (!bank || !enabledBanks().includes(bank)) return Response.json({ error: "ธนาคารนี้ยังไม่เปิดให้จ่าย" }, { status: 400 });

  const order = await ownOrder(db, typeof body.order === "string" ? body.order : null, readToken(req));
  if (!order) return Response.json({ error: "ไม่พบออร์เดอร์" }, { status: 404 });
  if (order.payment_status !== "pending") return Response.json({ error: "ออร์เดอร์นี้จ่ายแล้ว" }, { status: 409 });
  if (order.total < 20) return Response.json({ error: "ยอดขั้นต่ำคือ 20 บาท" }, { status: 400 });

  const back = new URL(`/shop?paid=${order.id}`, req.url).toString();
  try {
    const charge = await createBankCharge(order.total, order.id, order.order_no, bank, back);
    if (!charge.authorize_uri) throw new Error("no authorize_uri");
    const { error } = await db.from("shop_orders").update({ charge_id: charge.id }).eq("id", order.id);
    if (error) throw new Error(error.message);
    return Response.json({ url: charge.authorize_uri });
  } catch (e) {
    console.error("[shop] bank charge:", (e as Error).message);
    return Response.json({ error: "เปิดแอปธนาคารไม่สำเร็จ ลองสแกน QR แทน" }, { status: 502 });
  }
}
