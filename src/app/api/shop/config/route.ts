import { enabledBanks, omiseEnabled } from "@/lib/shop/omise";
import { closed, pickupLabel, readSettings, readToken, shopDb } from "@/lib/shop/shop.server";

export const runtime = "nodejs";
/** วันรับของเปลี่ยนตามเวลา และเมนูเปิด/ปิดได้ทุกเมื่อ */
export const dynamic = "force-dynamic";

/** เมนู ราคา รอบเวลารับ วันรับของ + แต้มของลูกค้า (ถ้ามือถือจำ token ไว้) */
export async function GET(req: Request) {
  const db = shopDb();
  if (!db) return closed();
  const settings = await readSettings(db);
  if (!settings?.promptpay_id) return closed();

  const [menu, pickup, customer] = await Promise.all([
    db.from("shop_menu").select("name, description, price, points, redeemable, available, image_url").order("sort"),
    db.rpc("shop_next_pickup"),
    (async () => {
      const token = readToken(req);
      if (!token) return null;
      const { data } = await db.from("shop_customers").select("code, nickname, points").eq("token", token).maybeSingle();
      return data;
    })(),
  ]);
  if (menu.error || pickup.error) return Response.json({ error: "โหลดเมนูไม่สำเร็จ" }, { status: 500 });

  // นับเฉพาะออร์เดอร์ที่จ่ายแล้วของรอบรับของเดียวกัน — โชว์บนหน้าร้านว่ามีคนสั่งจริง ไม่บอกว่าใคร
  const { count } = await db
    .from("shop_orders")
    .select("id", { count: "exact", head: true })
    .eq("pickup_date", pickup.data as string)
    .eq("payment_status", "paid")
    .neq("status", "cancelled");

  return Response.json(
    {
      shopName: settings.shop_name,
      cutoffHour: settings.cutoff_hour,
      slots: settings.pickup_slots,
      pickupLabel: pickupLabel(pickup.data as string),
      menu: menu.data,
      customer,
      // true = QR จาก Omise ระบบรู้เองว่าเงินเข้า · false = QR พร้อมเพย์ของร้าน ลูกค้ากด "โอนแล้ว"
      gateway: omiseEnabled(),
      // ปุ่ม "จ่ายผ่านแอปธนาคาร" — ว่าง = มีแต่ QR
      banks: enabledBanks(),
      roundOrders: count ?? 0,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
