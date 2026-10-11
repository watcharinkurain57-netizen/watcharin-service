import { confirmFromCharge, getCharge, omiseEnabled } from "@/lib/shop/omise";
import { shopDb } from "@/lib/shop/shop.server";

export const runtime = "nodejs";

/**
 * Omise แจ้งเมื่อ charge เปลี่ยนสถานะ — ตั้ง URL นี้ใน Omise Dashboard → Webhooks
 *
 * ไม่เชื่อเนื้อหาที่ส่งมา (ใครก็ยิง URL นี้ได้) ใช้แค่ charge id แล้วถาม Omise ซ้ำด้วย secret key
 * ตอบ 200 เสมอเมื่อไม่ใช่ความผิดฝั่งเรา ไม่งั้น Omise จะยิงซ้ำไปเรื่อย ๆ
 */
export async function POST(req: Request) {
  const db = shopDb();
  if (!db || !omiseEnabled()) return Response.json({ ok: false });

  let event: { key?: unknown; data?: { id?: unknown; object?: unknown } };
  try {
    event = await req.json();
  } catch {
    return Response.json({ ok: false });
  }
  const id = event.data?.id;
  if (event.key !== "charge.complete" || event.data?.object !== "charge" || typeof id !== "string" || !id.startsWith("chrg_")) {
    return Response.json({ ok: true, ignored: true });
  }

  try {
    const charge = await getCharge(id);
    if (charge.status !== "successful") return Response.json({ ok: true, status: charge.status });
    const paid = await confirmFromCharge(db, charge);
    // ยืนยันไม่ได้ (เช่นยอดไม่ตรง) — log ไว้ให้เจ้าของร้านดู แต่ไม่ให้ Omise ยิงซ้ำ
    return Response.json({ ok: true, confirmed: Boolean(paid) });
  } catch (e) {
    console.error("[shop] omise webhook:", (e as Error).message);
    return Response.json({ ok: false }, { status: 500 });
  }
}
