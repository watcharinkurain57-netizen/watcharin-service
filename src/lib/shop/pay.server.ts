import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type OwnOrder = {
  id: string;
  order_no: string;
  charge_id: string | null;
  payment_status: "pending" | "paid";
  total: number;
};

const COLS = "id, order_no, charge_id, payment_status, total";

/** ออร์เดอร์ของลูกค้าเจ้าของ token เท่านั้น — กันคนเดาเลขออร์เดอร์คนอื่นมาดู QR/สถานะ */
export async function ownOrder(db: SupabaseClient, orderId: string | null, token: string | null): Promise<OwnOrder | null> {
  if (!orderId || !token || !UUID.test(orderId) || !UUID.test(token)) return null;
  const { data: c } = await db.from("shop_customers").select("id").eq("token", token).maybeSingle();
  if (!c) return null;
  const { data } = await db
    .from("shop_orders")
    .select(COLS)
    .eq("id", orderId)
    .eq("customer_id", c.id)
    .maybeSingle();
  return data as OwnOrder | null;
}

/**
 * หาออร์เดอร์จาก id อย่างเดียว — ใช้ตอนธนาคารพากลับมาเปิดในเบราว์เซอร์อื่นที่ไม่มี token
 * id เป็น UUID เดาไม่ได้ และคนเรียกจะได้แค่สถานะกับเลขออร์เดอร์ ไม่เห็นข้อมูลลูกค้า
 */
export async function orderById(db: SupabaseClient, orderId: string | null): Promise<OwnOrder | null> {
  if (!orderId || !UUID.test(orderId)) return null;
  const { data } = await db.from("shop_orders").select(COLS).eq("id", orderId).maybeSingle();
  return data as OwnOrder | null;
}
