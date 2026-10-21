import { enabledBanks, omiseEnabled } from "@/lib/shop/omise";
import {
  branchSlug,
  closed,
  cutoffText,
  pickupLabel,
  readBranches,
  readSettings,
  readToken,
  shopDb,
  waitingToOpen,
} from "@/lib/shop/shop.server";

export const runtime = "nodejs";
/** วันรับของเปลี่ยนตามเวลา และเมนูเปิด/ปิดได้ทุกเมื่อ */
export const dynamic = "force-dynamic";

const NO_STORE = { headers: { "Cache-Control": "no-store" } };

/**
 * เมนู ราคา รอบเวลารับ วันรับของของสาขา + แต้มของลูกค้า (ถ้ามือถือจำ token ไว้)
 *
 * ?branch=<slug> มาจากหน้า /shop/<slug> (ปุ่มในไลน์ของสาขา)
 * ไม่ส่ง branch: มีสาขาเดียว = ใช้สาขานั้น · หลายสาขา = ตอบรายชื่อสาขาให้เลือก
 */
export async function GET(req: Request) {
  const db = shopDb();
  if (!db) return closed();
  const settings = await readSettings(db);
  if (!settings?.promptpay_id) return closed();
  const branches = await readBranches(db);
  if (!branches.length) return closed();

  const slug = branchSlug(new URL(req.url).searchParams.get("branch"));
  const branch = slug ? branches.find((b) => b.slug === slug) : branches.length === 1 ? branches[0] : undefined;
  if (slug && !branch) return Response.json({ error: "ไม่พบสาขานี้" }, { status: 404 });
  if (!branch) {
    return Response.json(
      {
        shopName: settings.shop_name,
        branches: branches.map((b) => ({
          slug: b.slug,
          name: b.name,
          pickupNote: b.pickup_note,
          delivery: b.delivery === true,
        })),
      },
      NO_STORE,
    );
  }

  const [menu, pickup, customer] = await Promise.all([
    db.from("shop_menu").select("name, description, price, points, redeemable, available, image_url").order("sort"),
    db.rpc("shop_branch_pickup", { p_branch: branch.id }),
    (async () => {
      const token = readToken(req);
      if (!token) return null;
      const { data } = await db.from("shop_customers").select("code, nickname, points").eq("token", token).maybeSingle();
      return data;
    })(),
  ]);
  if (menu.error || pickup.error) return Response.json({ error: "โหลดเมนูไม่สำเร็จ" }, { status: 500 });
  // null = สาขาปิดรับออร์เดอร์อยู่ (ปิดชั่วคราว ยังไม่ถึงเวลาเริ่มรับ หรือไม่มีวันเปิดข้างหน้า)
  const pickupDate = (pickup.data as string | null) ?? null;
  // ปิดเพราะยังไม่ถึงเวลาเริ่มรับ → หน้าร้านบอกเวลาเปิด แทน "ปิดรับออร์เดอร์" เฉย ๆ
  const opensAt = !pickupDate && branch.accepting && waitingToOpen(branch) ? branch.open_from : null;

  // นับเฉพาะออร์เดอร์ที่จ่ายแล้วของรอบรับของเดียวกันในสาขานี้ — โชว์ว่ามีคนสั่งจริง ไม่บอกว่าใคร
  let roundOrders = 0;
  if (pickupDate) {
    const { count } = await db
      .from("shop_orders")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", branch.id)
      .eq("pickup_date", pickupDate)
      .eq("payment_status", "paid")
      .neq("status", "cancelled");
    roundOrders = count ?? 0;
  }

  return Response.json(
    {
      shopName: settings.shop_name,
      branch: {
        slug: branch.slug,
        name: branch.name,
        pickupNote: branch.pickup_note,
        openchatUrl: branch.openchat_url,
        // ส่งถึงที่: หน้าร้านถามที่อยู่ + เบอร์โทร และเขียนว่า "ส่ง" แทน "รับ"
        delivery: branch.delivery === true,
      },
      // "19:30" ปิดรับออร์เดอร์ของวันถัดไป · openFrom = เริ่มรับทุกวัน (null = รับตลอด)
      cutoff: cutoffText(branch),
      openFrom: branch.open_from ?? null,
      opensAt,
      slots: branch.pickup_slots,
      pickupLabel: pickupDate ? pickupLabel(pickupDate) : null,
      menu: menu.data,
      customer,
      // true = QR จาก Omise ระบบรู้เองว่าเงินเข้า · false = QR พร้อมเพย์ของร้าน ลูกค้ากด "โอนแล้ว"
      gateway: omiseEnabled(),
      // ปุ่ม "จ่ายผ่านแอปธนาคาร" — ว่าง = มีแต่ QR
      banks: enabledBanks(),
      roundOrders,
      // LIFF ของสาขา (ดึงชื่อจากไลน์) — ไม่ตั้งที่สาขา ใช้ตัวกลางจาก env ถ้ามี
      liffId: branch.liff_id || process.env.NEXT_PUBLIC_SHOP_LIFF_ID?.trim() || "",
    },
    NO_STORE,
  );
}
