import { addDays, adminGuard, json } from "@/lib/shop/admin.server";
import { bangkokDate, readBranches } from "@/lib/shop/shop.server";

/**
 * ยอดขาย — นับเฉพาะออร์เดอร์ที่จ่ายแล้วและไม่ถูกยกเลิก ตามวันรับ/ส่งของ (เวลาไทย)
 * วันนี้ · พรุ่งนี้ (สั่งไว้แล้ว) · 7 วันล่าสุด · เดือนนี้ (รวมที่สั่งล่วงหน้าในเดือนนี้) · รายวัน 14 วัน · เมนูขายดีเดือนนี้
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = { pickup_date: string; branch_id: string; total: number; items: { name: string; qty: number; price?: number }[] };
type Sum = { orders: number; money: number };

const empty = (): Sum => ({ orders: 0, money: 0 });
const add = (s: Sum, r: Row) => {
  s.orders += 1;
  s.money += r.total;
};

export async function GET(req: Request) {
  const g = await adminGuard(req);
  if (g instanceof Response) return g;
  const { db } = g;

  const today = bangkokDate();
  const tomorrow = addDays(today, 1);
  const weekFrom = addDays(today, -6);
  const dayFrom = addDays(today, -13);
  const monthFrom = `${today.slice(0, 8)}01`;
  const monthTo = addDays(`${addDays(monthFrom, 32).slice(0, 8)}01`, -1);
  const from = monthFrom < dayFrom ? monthFrom : dayFrom;
  const to = monthTo > tomorrow ? monthTo : tomorrow;

  const [branches, orders, customers] = await Promise.all([
    readBranches(db),
    db
      .from("shop_orders")
      .select("pickup_date, branch_id, total, items")
      .eq("payment_status", "paid")
      .neq("status", "cancelled")
      .gte("pickup_date", from)
      .lte("pickup_date", to)
      .limit(10000),
    db.from("shop_customers").select("id", { count: "exact", head: true }),
  ]);
  if (orders.error) {
    console.error("[shop] admin stats:", orders.error.message);
    return json({ error: "โหลดยอดขายไม่สำเร็จ" }, 500);
  }
  const rows = (orders.data ?? []) as Row[];

  const windows = { today: empty(), tomorrow: empty(), week: empty(), month: empty() };
  const perBranch = new Map(branches.map((b) => [b.id, { today: empty(), week: empty(), month: empty() }]));
  const daily = new Map<string, Sum>();
  for (let d = dayFrom; d <= today; d = addDays(d, 1)) daily.set(d, empty());
  const menu = new Map<string, { qty: number; money: number }>();

  for (const r of rows) {
    const b = perBranch.get(r.branch_id);
    if (r.pickup_date === today) {
      add(windows.today, r);
      if (b) add(b.today, r);
    }
    if (r.pickup_date === tomorrow) add(windows.tomorrow, r);
    if (r.pickup_date >= weekFrom && r.pickup_date <= today) {
      add(windows.week, r);
      if (b) add(b.week, r);
    }
    if (r.pickup_date >= monthFrom && r.pickup_date <= monthTo) {
      add(windows.month, r);
      if (b) add(b.month, r);
      for (const i of r.items) {
        const m = menu.get(i.name) ?? { qty: 0, money: 0 };
        m.qty += i.qty;
        m.money += (i.price ?? 0) * i.qty;
        menu.set(i.name, m);
      }
    }
    const day = daily.get(r.pickup_date);
    if (day) add(day, r);
  }

  return json({
    date: today,
    monthOf: monthFrom.slice(0, 7),
    ...windows,
    branches: branches.map((b) => ({ slug: b.slug, name: b.name, ...perBranch.get(b.id)! })),
    daily: [...daily].map(([date, s]) => ({ date, ...s })),
    topMenu: [...menu].map(([name, m]) => ({ name, ...m })).sort((a, b) => b.qty - a.qty),
    customers: customers.count ?? 0,
  });
}
