import type { SupabaseClient } from "@supabase/supabase-js";
import { UUID_RE, adminGuard, badRequest, json, readJson } from "@/lib/shop/admin.server";

/**
 * เมนู (ใช้ร่วมกันทุกสาขา)
 * GET                       → ทุกเมนู รวมที่ปิดไว้
 * POST   { name, price, … } → เพิ่มเมนู (ต่อท้าย)
 * PATCH  { id, …ช่องที่แก้ } → แก้ · { id, move: "up" | "down" } → เลื่อนลำดับ
 * DELETE ?id=               → ลบ (ออร์เดอร์เก่าเก็บชื่อและราคาไว้ในตัวเองแล้ว ไม่กระทบ)
 * ชื่อเมนูคือสิ่งที่หน้าร้านส่งมาสั่ง — เปลี่ยนชื่อได้ ออร์เดอร์ใหม่ใช้ชื่อใหม่
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLS = "id, sort, name, description, price, points, redeemable, available, image_url";

type Fields = {
  name?: string;
  description?: string;
  price?: number;
  points?: number;
  redeemable?: boolean;
  available?: boolean;
  image_url?: string;
};

const int = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

/** ช่องที่แก้ได้เท่านั้น — ค่าผิด = ข้อความบอกว่าช่องไหน */
function readFields(b: Record<string, unknown>, create: boolean): Fields | string {
  const f: Fields = {};
  if (create || "name" in b) {
    const name = typeof b.name === "string" ? b.name.trim() : "";
    if (!name || name.length > 60) return "ชื่อเมนูต้องมี 1-60 ตัวอักษร";
    f.name = name;
  }
  if ("description" in b || create) {
    const d = typeof b.description === "string" ? b.description.trim() : b.description === undefined ? "" : null;
    if (d === null || d.length > 200) return "คำอธิบายยาวได้ไม่เกิน 200 ตัวอักษร";
    f.description = d;
  }
  if (create || "price" in b) {
    if (!int(b.price, 1, 100000)) return "ราคาต้องเป็นจำนวนเต็ม 1-100,000 บาท";
    f.price = b.price as number;
  }
  if ("points" in b || create) {
    const p = b.points === undefined ? 1 : b.points;
    if (!int(p, 0, 100)) return "แต้มต้องเป็นจำนวนเต็ม 0-100";
    f.points = p as number;
  }
  for (const k of ["redeemable", "available"] as const) {
    if (k in b) {
      if (typeof b[k] !== "boolean") return "ค่าเปิด/ปิดไม่ถูกต้อง";
      f[k] = b[k] as boolean;
    }
  }
  // ลบรูปได้ (ใส่รูปใหม่ผ่าน /menu/image)
  if ("image_url" in b) {
    if (b.image_url !== "") return "เปลี่ยนรูปผ่านปุ่มอัปโหลดรูป";
    f.image_url = "";
  }
  return f;
}

function dbError(where: string, e: { message: string; code?: string }) {
  if (e.code === "23505") return json({ error: "มีเมนูชื่อนี้อยู่แล้ว" }, 409);
  console.error(`[shop] admin menu ${where}:`, e.message);
  return json({ error: "บันทึกเมนูไม่สำเร็จ" }, 500);
}

async function list(db: SupabaseClient) {
  return db.from("shop_menu").select(COLS).order("sort").order("name");
}

export async function GET(req: Request) {
  const g = await adminGuard(req);
  if (g instanceof Response) return g;
  const { data, error } = await list(g.db);
  if (error) return dbError("list", error);
  return json({ menu: data });
}

export async function POST(req: Request) {
  const g = await adminGuard(req);
  if (g instanceof Response) return g;
  const body = await readJson(req);
  if (!body) return badRequest("ข้อมูลไม่ถูกต้อง");
  const f = readFields(body, true);
  if (typeof f === "string") return badRequest(f);
  const { data: last } = await g.db.from("shop_menu").select("sort").order("sort", { ascending: false }).limit(1);
  const sort = ((last?.[0]?.sort as number | undefined) ?? 0) + 10;
  const { data, error } = await g.db.from("shop_menu").insert({ ...f, sort }).select(COLS).single();
  if (error) return dbError("create", error);
  return json({ item: data }, 201);
}

export async function PATCH(req: Request) {
  const g = await adminGuard(req);
  if (g instanceof Response) return g;
  const { db } = g;
  const body = await readJson(req);
  const id = typeof body?.id === "string" && UUID_RE.test(body.id) ? body.id : "";
  if (!body || !id) return badRequest("ข้อมูลไม่ถูกต้อง");

  if (body.move === "up" || body.move === "down") {
    const { data, error } = await list(db);
    if (error) return dbError("move", error);
    const rows = data ?? [];
    const i = rows.findIndex((r) => r.id === id);
    if (i < 0) return json({ error: "ไม่พบเมนูนี้" }, 404);
    const j = body.move === "up" ? i - 1 : i + 1;
    if (j >= 0 && j < rows.length) [rows[i], rows[j]] = [rows[j], rows[i]];
    // จัดเลขลำดับใหม่ทั้งหมด (เลขเดิมอาจซ้ำกัน) แก้เฉพาะแถวที่เลขเปลี่ยน
    for (const [k, r] of rows.entries()) {
      if (r.sort === (k + 1) * 10) continue;
      const { error: e } = await db.from("shop_menu").update({ sort: (k + 1) * 10 }).eq("id", r.id);
      if (e) return dbError("move", e);
      r.sort = (k + 1) * 10;
    }
    return json({ menu: rows });
  }

  const f = readFields(body, false);
  if (typeof f === "string") return badRequest(f);
  if (!Object.keys(f).length) return badRequest("ไม่มีอะไรให้แก้");
  const { data, error } = await db.from("shop_menu").update(f).eq("id", id).select(COLS);
  if (error) return dbError("update", error);
  if (!data?.length) return json({ error: "ไม่พบเมนูนี้" }, 404);
  return json({ item: data[0] });
}

export async function DELETE(req: Request) {
  const g = await adminGuard(req);
  if (g instanceof Response) return g;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!UUID_RE.test(id)) return badRequest("ข้อมูลไม่ถูกต้อง");
  const { data, error } = await g.db.from("shop_menu").delete().eq("id", id).select("id");
  if (error) return dbError("delete", error);
  if (!data?.length) return json({ error: "ไม่พบเมนูนี้" }, 404);
  return json({ deleted: id });
}
