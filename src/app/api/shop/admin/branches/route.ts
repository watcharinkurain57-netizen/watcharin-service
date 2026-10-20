import { UUID_RE, adminGuard, badRequest, isDate, json, readJson } from "@/lib/shop/admin.server";
import { orderLink } from "@/lib/shop/richmenu";
import { readBranches } from "@/lib/shop/shop.server";

/**
 * ตั้งค่าสาขา
 * GET   → ทุกสาขา (+ ลิงก์ปุ่มสั่งอาหาร)
 * PATCH { id, …ช่องที่แก้ } — แก้ได้แค่: เปิด/ปิดรับ เวลาปิดรับ วันเปิด รอบเวลา วันหยุด จุดรับของ ลิงก์ OpenChat ส่งถึงที่
 *       แจ้งเข้าไลน์ทุกออร์เดอร์
 *       ชื่อ slug รหัส ไลน์ LIFF ของสาขาแก้จากที่นี่ไม่ได้ (ผูกกับลิงก์ในไลน์ นามบัตร และเลขออร์เดอร์)
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLOT_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

type Patch = {
  accepting?: boolean;
  cutoff_hour?: number;
  open_days?: number[];
  pickup_slots?: string[];
  closed_dates?: string[];
  pickup_note?: string;
  openchat_url?: string;
  delivery?: boolean;
  notify_orders?: boolean;
};

function readPatch(b: Record<string, unknown>): Patch | string {
  const p: Patch = {};
  for (const k of ["accepting", "delivery", "notify_orders"] as const) {
    if (k in b) {
      if (typeof b[k] !== "boolean") return "ค่าเปิด/ปิดไม่ถูกต้อง";
      p[k] = b[k] as boolean;
    }
  }
  if ("cutoff_hour" in b) {
    const h = b.cutoff_hour;
    if (typeof h !== "number" || !Number.isInteger(h) || h < 0 || h > 23) return "เวลาปิดรับต้องเป็น 0-23 นาฬิกา";
    p.cutoff_hour = h;
  }
  if ("open_days" in b) {
    const d = b.open_days;
    if (!Array.isArray(d) || !d.length || d.some((x) => !Number.isInteger(x) || x < 0 || x > 6)) {
      return "เลือกวันเปิดอย่างน้อย 1 วัน";
    }
    p.open_days = [...new Set(d as number[])].sort((a, z) => a - z);
  }
  if ("pickup_slots" in b) {
    const s = b.pickup_slots;
    if (!Array.isArray(s) || !s.length || s.length > 24 || s.some((x) => typeof x !== "string" || !SLOT_RE.test(x))) {
      return "รอบเวลาต้องเป็นแบบ 18:00 มี 1-24 รอบ";
    }
    p.pickup_slots = [...new Set(s as string[])].sort();
  }
  if ("closed_dates" in b) {
    const c = b.closed_dates;
    if (!Array.isArray(c) || c.length > 100 || c.some((x) => !isDate(x))) return "วันหยุดไม่ถูกต้อง";
    p.closed_dates = [...new Set(c as string[])].sort();
  }
  if ("pickup_note" in b) {
    if (typeof b.pickup_note !== "string" || b.pickup_note.trim().length > 120) return "จุดรับของยาวได้ไม่เกิน 120 ตัวอักษร";
    p.pickup_note = b.pickup_note.trim();
  }
  if ("openchat_url" in b) {
    const u = typeof b.openchat_url === "string" ? b.openchat_url.trim() : null;
    if (u === null || (u && (!/^https:\/\/line\.me\/\S+$/.test(u) || u.length > 300))) {
      return "ลิงก์ OpenChat ต้องขึ้นต้นด้วย https://line.me/";
    }
    p.openchat_url = u;
  }
  return p;
}

export async function GET(req: Request) {
  const g = await adminGuard(req);
  if (g instanceof Response) return g;
  const branches = await readBranches(g.db);
  return json({ branches: branches.map((b) => ({ ...b, orderLink: orderLink(b) })) });
}

export async function PATCH(req: Request) {
  const g = await adminGuard(req);
  if (g instanceof Response) return g;
  const body = await readJson(req);
  const id = typeof body?.id === "string" && UUID_RE.test(body.id) ? body.id : "";
  if (!body || !id) return badRequest("ข้อมูลไม่ถูกต้อง");
  const p = readPatch(body);
  if (typeof p === "string") return badRequest(p);
  if (!Object.keys(p).length) return badRequest("ไม่มีอะไรให้แก้");
  const { data, error } = await g.db.from("shop_branches").update(p).eq("id", id).select("id");
  if (error) {
    console.error("[shop] admin branch patch:", error.message);
    return json({ error: "บันทึกไม่สำเร็จ" }, 500);
  }
  if (!data?.length) return json({ error: "ไม่พบสาขานี้" }, 404);
  const branch = (await readBranches(g.db)).find((b) => b.id === id);
  return json({ branch: branch ? { ...branch, orderLink: orderLink(branch) } : null });
}
