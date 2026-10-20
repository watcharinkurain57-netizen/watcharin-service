import { confirmFromCharge, getCharge, omiseEnabled, type PaidResult } from "@/lib/shop/omise";
import { orderById, ownOrder } from "@/lib/shop/pay.server";
import { closed, pickupLabel, readToken, shopDb } from "@/lib/shop/shop.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ถามซ้ำทุก 3 วิ — ห้าม cache ตรงไหนเลย ไม่งั้นหน้าเว็บค้าง "รอเงินเข้า" */
const NO_STORE = { headers: { "Cache-Control": "no-store" } };

/**
 * หน้าจ่ายเงินถามทุกไม่กี่วินาทีว่าเงินเข้าหรือยัง
 * ถาม Omise ตรง ๆ ด้วย ไม่ต้องรอ webhook — ถ้า webhook มาก่อน ออร์เดอร์ก็เป็น paid อยู่แล้ว
 *
 * ไม่มี token (ธนาคารพากลับมาเปิดในเบราว์เซอร์อื่น): ยังเช็กและยืนยันได้
 * แต่ตอบแค่เลขออร์เดอร์กับวันรับ ไม่ส่งรหัสลูกค้าหรือแต้มออกไป
 */
export async function GET(req: Request) {
  const db = shopDb();
  if (!db || !omiseEnabled()) return closed();
  const id = new URL(req.url).searchParams.get("order");
  const mine = await ownOrder(db, id, readToken(req));
  const order = mine ?? (await orderById(db, id));
  if (!order) return Response.json({ error: "ไม่พบออร์เดอร์" }, { status: 404 });

  const done = (r: PaidResult) => {
    const shown = mine ? r : { orderNo: r.orderNo, pickupDate: r.pickupDate, slot: r.slot, total: r.total };
    return Response.json({ status: "paid", ...shown, pickupLabel: pickupLabel(r.pickupDate) }, NO_STORE);
  };

  if (order.payment_status === "paid") {
    // จ่ายแล้ว (webhook มาก่อน) — เรียกซ้ำได้ ไม่นับแต้มซ้ำ แค่คืนผลเดิม
    const { data, error } = await db.rpc("shop_confirm_payment", {
      p_order_id: order.id,
      p_charge_id: order.charge_id,
      p_amount: 0,
    });
    if (error) return Response.json({ error: "เช็กสถานะไม่สำเร็จ" }, { status: 500 });
    return done(data);
  }
  if (!order.charge_id) return Response.json({ status: "pending" }, NO_STORE);

  try {
    const charge = await getCharge(order.charge_id);
    if (charge.status === "successful") {
      const paid = await confirmFromCharge(db, charge);
      if (paid) return done(paid);
      return Response.json({ error: "เช็กสถานะไม่สำเร็จ" }, { status: 500 });
    }
    if (charge.status === "expired" || charge.status === "failed") return Response.json({ status: "expired" }, NO_STORE);
    return Response.json({ status: "pending" }, NO_STORE);
  } catch (e) {
    console.error("[shop] pay status:", (e as Error).message);
    return Response.json({ status: "pending" }, NO_STORE);
  }
}
