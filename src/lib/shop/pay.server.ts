import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type OwnOrder = {
  id: string;
  order_no: string;
  charge_id: string | null;
  payment_status: "pending" | "paid";
};

/** ออร์เดอร์ของลูกค้าเจ้าของ token เท่านั้น — กันคนเดาเลขออร์เดอร์คนอื่นมาดู QR/สถานะ */
export async function ownOrder(db: SupabaseClient, orderId: string | null, token: string | null): Promise<OwnOrder | null> {
  if (!orderId || !token || !UUID.test(orderId) || !UUID.test(token)) return null;
  const { data: c } = await db.from("shop_customers").select("id").eq("token", token).maybeSingle();
  if (!c) return null;
  const { data } = await db
    .from("shop_orders")
    .select("id, order_no, charge_id, payment_status")
    .eq("id", orderId)
    .eq("customer_id", c.id)
    .maybeSingle();
  return data as OwnOrder | null;
}
