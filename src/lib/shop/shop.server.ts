import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * ร้านแซลดอง กุ้งแช่ (/shop) — ฝั่งเซิร์ฟเวอร์
 *
 * ลูกค้าไม่ได้ล็อกอิน ตารางร้านจึงปิด RLS สำหรับ anon ทั้งหมด (ดู 0024)
 * ทุกคำขอผ่านตรงนี้ด้วย SUPABASE_SECRET_KEY ซึ่งข้าม RLS
 * ⚠️ ห้าม import ไฟล์นี้จาก client component
 *
 * ไม่ผูกกับ INTERNAL_WORKSPACE_ENABLED: ร้านเปิดได้ในโหมด portfolio
 * ขอแค่มี NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY ไม่ครบ = ตอบ 503
 *
 * SHOP_SUPABASE_URL (ไม่บังคับ) ใช้แทน NEXT_PUBLIC_SUPABASE_URL เฉพาะร้าน
 * เพราะบน Vercel Preview เว็บส่วนอื่นต่อ Supabase โปรเจกต์ dev
 * แต่ SUPABASE_SECRET_KEY ใช้ค่าเดียวกับ Production → URL กับ key ต้องเป็นโปรเจกต์เดียวกัน
 */
/** ฐานข้อมูลไม่ตอบใน 20 วินาที = ตัดทิ้ง ตอบเออเรอร์แทนการค้าง */
export const DB_TIMEOUT_MS = 20_000;

/**
 * ทุกคำขอไปฐานข้อมูลของร้านมี signal เสมอ: กันค้าง และ fetch ของ Next.js
 * จะไม่แอบก๊อปคำตอบ GET ที่ไม่มี signal เก็บไว้อีกชุด (ปัญหาเดียวกับหน้าเช็กไลน์ที่เคยค้าง 20 ต.ค.)
 */
export const shopFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(DB_TIMEOUT_MS) });

/** โปรเจกต์ Supabase ของร้าน (ไม่ครบ = null) — ใช้ทั้งฐานข้อมูลและเข้าหลังบ้านด้วย Google */
export function shopSupabaseEnv(): { url: string; key: string } | null {
  const url = (process.env.SHOP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  return url && key ? { url, key } : null;
}

let client: SupabaseClient | null | undefined;
export function shopDb(): SupabaseClient | null {
  if (client === undefined) {
    const env = shopSupabaseEnv();
    client = env ? createClient(env.url, env.key, { auth: { persistSession: false }, global: { fetch: shopFetch } }) : null;
  }
  return client;
}

export const closed = () =>
  Response.json({ error: "ร้านยังไม่เปิดรับออร์เดอร์ออนไลน์" }, { status: 503 });

/** ใช้ร่วมกันทุกสาขา — เวลาปิดรับ วันเปิด รอบรับของ อยู่ที่ shop_branches แล้ว */
export type ShopSettings = {
  shop_name: string;
  promptpay_id: string;
};

export async function readSettings(db: SupabaseClient): Promise<ShopSettings | null> {
  const { data, error } = await db
    .from("shop_settings")
    .select("shop_name, promptpay_id")
    .eq("id", 1)
    .maybeSingle();
  // ไม่งั้นหน้าร้านขึ้นแค่ "ยังไม่เปิด" แล้วไม่รู้ว่าเพราะ key ผิดหรือยังไม่ใส่พร้อมเพย์
  if (error) console.error("[shop] readSettings:", error.message);
  return data;
}

/** สาขา (0027_shop_branches) — แต่ละสาขามีไลน์ร้านของตัวเอง เวลาปิดรับ วันเปิด และรอบรับของเอง */
export type ShopBranch = {
  id: string;
  slug: string;
  code: string;
  name: string;
  line_id: string;
  liff_id: string;
  openchat_url: string;
  pickup_note: string;
  /** ปิดรับออร์เดอร์ของวันถัดไปตอน cutoff_hour:cutoff_minute (เวลาไทย) */
  cutoff_hour: number;
  cutoff_minute: number;
  /** "HH:MM" เริ่มรับออร์เดอร์ทุกวัน (0033) · null = รับตลอด */
  open_from: string | null;
  open_days: number[];
  closed_dates: string[];
  pickup_slots: string[];
  accepting: boolean;
  /** true = ส่งถึงที่ (0029) ลูกค้าใส่ที่อยู่ + เบอร์โทร · pickup_slots = เวลาส่ง */
  delivery: boolean;
  /** true = แจ้งเข้าไลน์ทุกออร์เดอร์ที่จ่ายแล้ว (0032) นอกจากสรุปรายวัน */
  notify_orders: boolean;
};

const BRANCH_COLS =
  "id, slug, code, name, line_id, liff_id, openchat_url, pickup_note, cutoff_hour, cutoff_minute, open_from, open_days, closed_dates, pickup_slots, accepting, delivery, notify_orders";

export async function readBranches(db: SupabaseClient): Promise<ShopBranch[]> {
  const { data, error } = await db.from("shop_branches").select(BRANCH_COLS).order("sort").order("created_at");
  if (error) console.error("[shop] readBranches:", error.message);
  return (data ?? []) as ShopBranch[];
}

/** slug จาก URL/body — ไม่ตรงรูปแบบ = "" */
export function branchSlug(value: unknown): string {
  const s = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[a-z0-9][a-z0-9-]{0,29}$/.test(s) ? s : "";
}

const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];
const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** "2026-10-19" → "วันจันทร์ 19 ต.ค." (วันที่ล้วน ไม่มีเรื่อง timezone) */
export function pickupLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `วัน${DAYS[dow]} ${d} ${MONTHS[m - 1]}`;
}

/** วันที่ตามเวลาไทย บวก n วัน → "YYYY-MM-DD" */
export function bangkokDate(addDays = 0, now = Date.now()): string {
  return new Date(now + 7 * 3600_000 + addDays * 86400_000).toISOString().slice(0, 10);
}

/** ชั่วโมงตอนนี้ตามเวลาไทย (0-23) */
export function bangkokHour(now = Date.now()): number {
  return new Date(now + 7 * 3600_000).getUTCHours();
}

/** นาทีนับจากเที่ยงคืนตามเวลาไทย (0-1439) */
export function bangkokMinute(now = Date.now()): number {
  const t = new Date(now + 7 * 3600_000);
  return t.getUTCHours() * 60 + t.getUTCMinutes();
}

/** "08:30" → 510 */
export function hhmmMinutes(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** เวลาปิดรับของสาขา "19:30" */
export function cutoffText(b: Pick<ShopBranch, "cutoff_hour" | "cutoff_minute">): string {
  return `${pad(b.cutoff_hour)}:${pad(b.cutoff_minute ?? 0)}`;
}

const cutoffMinutes = (b: Pick<ShopBranch, "cutoff_hour" | "cutoff_minute">) => b.cutoff_hour * 60 + (b.cutoff_minute ?? 0);

/**
 * ตอนนี้อยู่ในช่วงยังไม่เปิดรับ (ตั้งแต่ปิดรับจนถึงเวลาเริ่มรับ ข้ามเที่ยงคืนได้)
 * ต้องตรงกับ shop_branch_pickup ใน 0033 — ฐานข้อมูลเป็นตัวตัดสินจริง อันนี้ไว้บอกลูกค้าว่าทำไมสั่งไม่ได้
 */
export function waitingToOpen(b: Pick<ShopBranch, "cutoff_hour" | "cutoff_minute" | "open_from">, now = Date.now()): boolean {
  if (!b.open_from) return false;
  const cut = cutoffMinutes(b);
  const open = hhmmMinutes(b.open_from);
  if (open === cut) return false;
  return (bangkokMinute(now) - cut + 1440) % 1440 < (open - cut + 1440) % 1440;
}

/**
 * สาขาที่ถึงเวลาส่งสรุป — cron เรียกทุก 5 นาที (นาทีที่ 0, 5, 10, …)
 * ส่งรอบที่เรียกหลังปิดรับ 5-9 นาที (เผื่อลูกค้าที่กำลังจ่ายตอนปิดรับ) = ครั้งเดียวต่อรอบ
 * นับจากนาทีที่ cron ตั้งเวลาไว้ (ปัดลงทีละ 5 นาที) เรียกช้าไปไม่กี่นาทีก็ไม่ส่งซ้ำ
 * pickup = วันถัดจากวันที่ปิดรับ (ปิดรับ 23:58 สรุปตอน 00:05 ยังเป็นของวันถัดจากเมื่อวาน)
 */
export function dueRounds<B extends Pick<ShopBranch, "cutoff_hour" | "cutoff_minute">>(
  branches: B[],
  now = Date.now(),
): { branch: B; pickup: string }[] {
  const nowMin = bangkokMinute(now);
  const slot = nowMin - (nowMin % 5);
  const out: { branch: B; pickup: string }[] = [];
  for (const b of branches) {
    const cut = cutoffMinutes(b);
    const ago = (slot - cut + 1440) % 1440;
    if (ago < 5 || ago >= 10) continue;
    const since = (nowMin - cut + 1440) % 1440;
    out.push({ branch: b, pickup: bangkokDate(1, now - since * 60_000) });
  }
  return out;
}

/** token ลูกค้าจาก header — uuid เท่านั้น */
export function readToken(req: Request): string | null {
  const t = req.headers.get("x-shop-token")?.trim() ?? "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t) ? t : null;
}
