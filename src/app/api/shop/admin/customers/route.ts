import { ORDER_COLS, UUID_RE, adminGuard, badRequest, json, readJson } from "@/lib/shop/admin.server";

/**
 * ลูกค้า (ชื่อเล่น + รหัส S001 ไม่มีข้อมูลส่วนตัวอื่น ยกเว้นที่อยู่ในออร์เดอร์ส่งถึงที่)
 * line = บัตรผูกกับบัญชีไลน์แล้วไหม (0031) — ไม่ส่งรหัสไลน์ออกไป
 * GET   ?q=        → ค้นชื่อเล่น/รหัส (ไม่ใส่ = ล่าสุด 100 คน) พร้อมจำนวนออร์เดอร์
 * GET   ?id=       → ลูกค้าคนนั้น + 20 ออร์เดอร์ล่าสุด
 * PATCH { id, points?, note? } → แก้แต้ม (0-1000) / โน้ต (ไม่เกิน 300 ตัว)
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLS = "id, code, nickname, points, rewards_used, total_spent, note, created_at, last_order_at, line_user_id";

/** รหัสไลน์ของลูกค้าไม่ออกนอกเซิร์ฟเวอร์ — บอกแค่ว่าผูกแล้วหรือยัง */
function pub<T extends { line_user_id?: string | null }>(c: T): Omit<T, "line_user_id"> & { line: boolean } {
  const { line_user_id, ...rest } = c;
  return { ...rest, line: !!line_user_id };
}

export async function GET(req: Request) {
  const g = await adminGuard(req);
  if (g instanceof Response) return g;
  const { db } = g;
  const params = new URL(req.url).searchParams;

  const id = params.get("id");
  if (id) {
    if (!UUID_RE.test(id)) return badRequest("ข้อมูลไม่ถูกต้อง");
    const [c, o] = await Promise.all([
      db.from("shop_customers").select(COLS).eq("id", id).maybeSingle(),
      db.from("shop_orders").select(ORDER_COLS).eq("customer_id", id).order("created_at", { ascending: false }).limit(20),
    ]);
    if (c.error || o.error) {
      console.error("[shop] admin customer:", c.error?.message ?? o.error?.message);
      return json({ error: "โหลดข้อมูลลูกค้าไม่สำเร็จ" }, 500);
    }
    if (!c.data) return json({ error: "ไม่พบลูกค้า" }, 404);
    return json({ customer: pub(c.data), orders: o.data ?? [] });
  }

  // ตัดตัวที่ทำให้ตัวกรองของ PostgREST เพี้ยน
  const q = (params.get("q") ?? "").replace(/[,()*%\\:."']/g, " ").trim().slice(0, 30);
  let query = db.from("shop_customers").select(COLS);
  if (q) query = query.or(`nickname.ilike.*${q}*,code.ilike.*${q}*`);
  const { data, error } = await query
    .order("last_order_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("[shop] admin customers:", error.message);
    return json({ error: "โหลดรายชื่อลูกค้าไม่สำเร็จ" }, 500);
  }
  const list = data ?? [];
  const count = new Map<string, number>();
  if (list.length) {
    const { data: rows } = await db
      .from("shop_orders")
      .select("customer_id")
      .in(
        "customer_id",
        list.map((c) => c.id),
      )
      .eq("payment_status", "paid")
      .neq("status", "cancelled")
      .limit(10000);
    for (const r of rows ?? []) count.set(r.customer_id, (count.get(r.customer_id) ?? 0) + 1);
  }
  return json({ customers: list.map((c) => ({ ...pub(c), orders: count.get(c.id) ?? 0 })) });
}

export async function PATCH(req: Request) {
  const g = await adminGuard(req);
  if (g instanceof Response) return g;
  const body = await readJson(req);
  const id = typeof body?.id === "string" && UUID_RE.test(body.id) ? body.id : "";
  if (!body || !id) return badRequest("ข้อมูลไม่ถูกต้อง");
  const f: { points?: number; note?: string } = {};
  if ("points" in body) {
    const p = body.points;
    if (typeof p !== "number" || !Number.isInteger(p) || p < 0 || p > 1000) return badRequest("แต้มต้องเป็นจำนวนเต็ม 0-1000");
    f.points = p;
  }
  if ("note" in body) {
    if (typeof body.note !== "string" || body.note.trim().length > 300) return badRequest("โน้ตยาวได้ไม่เกิน 300 ตัวอักษร");
    f.note = body.note.trim();
  }
  if (!Object.keys(f).length) return badRequest("ไม่มีอะไรให้แก้");
  const { data, error } = await g.db.from("shop_customers").update(f).eq("id", id).select(COLS);
  if (error) {
    console.error("[shop] admin customer patch:", error.message);
    return json({ error: "บันทึกไม่สำเร็จ" }, 500);
  }
  if (!data?.length) return json({ error: "ไม่พบลูกค้า" }, 404);
  return json({ customer: pub(data[0]) });
}
