import { ORDER_COLS, UUID_RE, adminGuard, badRequest, isDate, json, readJson } from "@/lib/shop/admin.server";
import { bangkokDate, branchSlug, readBranches } from "@/lib/shop/shop.server";

/**
 * ออร์เดอร์ของวันรับ/ส่งของ
 * GET   ?date=YYYY-MM-DD (ไม่ใส่ = วันนี้ตามเวลาไทย) &branch=<slug> (ไม่ใส่ = ทุกสาขา)
 *       → ออร์เดอร์ + ของที่ต้องเตรียม (นับเฉพาะที่จ่ายแล้ว ไม่ถูกยกเลิก)
 * PATCH { id, action } action = check | uncheck (เช็กเงินเข้าแล้ว) · done | undone (ส่ง/รับแล้ว) · cancel
 *       ยกเลิกแล้วคืนแต้มอัตโนมัติ (trigger shop_order_cancelled) และย้อนกลับไม่ได้
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  branch_id: string;
  items: { name: string; qty: number }[];
  total: number;
  payment_status: string;
  payment_checked: boolean;
  status: string;
};

export async function GET(req: Request) {
  const g = await adminGuard(req);
  if (g instanceof Response) return g;
  const { db } = g;
  const q = new URL(req.url).searchParams;
  const date = q.get("date") || bangkokDate();
  if (!isDate(date)) return badRequest("วันที่ไม่ถูกต้อง");
  const branches = await readBranches(db);
  const slug = branchSlug(q.get("branch"));
  const branch = slug ? branches.find((b) => b.slug === slug) : undefined;
  if (slug && !branch) return json({ error: "ไม่พบสาขานี้" }, 404);

  let query = db.from("shop_orders").select(ORDER_COLS).eq("pickup_date", date);
  if (branch) query = query.eq("branch_id", branch.id);
  const { data, error } = await query.order("pickup_slot").order("order_no").limit(500);
  if (error) {
    console.error("[shop] admin orders:", error.message);
    return json({ error: "โหลดออร์เดอร์ไม่สำเร็จ" }, 500);
  }
  const rows = (data ?? []) as unknown as Row[];
  const live = rows.filter((r) => r.payment_status === "paid" && r.status !== "cancelled");
  const prep = new Map<string, number>();
  for (const r of live) for (const i of r.items) prep.set(i.name, (prep.get(i.name) ?? 0) + i.qty);

  return json({
    date,
    branches: branches.map((b) => ({ id: b.id, slug: b.slug, name: b.name, code: b.code, delivery: b.delivery })),
    orders: rows,
    prep: [...prep].map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty),
    totals: {
      orders: live.length,
      money: live.reduce((s, r) => s + r.total, 0),
      unchecked: live.filter((r) => !r.payment_checked).length,
      done: live.filter((r) => r.status === "done").length,
      pending: rows.filter((r) => r.payment_status === "pending" && r.status !== "cancelled").length,
    },
  });
}

const ACTIONS = ["check", "uncheck", "done", "undone", "cancel"] as const;
type Action = (typeof ACTIONS)[number];

export async function PATCH(req: Request) {
  const g = await adminGuard(req);
  if (g instanceof Response) return g;
  const { db } = g;
  const body = await readJson(req);
  const id = typeof body?.id === "string" && UUID_RE.test(body.id) ? body.id : "";
  const action = ACTIONS.find((a) => a === body?.action) as Action | undefined;
  if (!id || !action) return badRequest("คำสั่งไม่ถูกต้อง");

  let query;
  if (action === "check" || action === "uncheck") {
    query = db.from("shop_orders").update({ payment_checked: action === "check" }).eq("id", id);
  } else if (action === "done") {
    query = db.from("shop_orders").update({ status: "done" }).eq("id", id).eq("status", "new");
  } else if (action === "undone") {
    query = db.from("shop_orders").update({ status: "new" }).eq("id", id).eq("status", "done");
  } else {
    query = db.from("shop_orders").update({ status: "cancelled" }).eq("id", id).neq("status", "cancelled");
  }
  const { data, error } = await query.select(ORDER_COLS);
  if (error) {
    console.error("[shop] admin order patch:", error.message);
    return json({ error: "แก้ออร์เดอร์ไม่สำเร็จ" }, 500);
  }
  if (!data?.length) return json({ error: "ออร์เดอร์นี้เปลี่ยนไปแล้ว ลองรีเฟรช" }, 409);
  return json({ order: data[0] });
}
