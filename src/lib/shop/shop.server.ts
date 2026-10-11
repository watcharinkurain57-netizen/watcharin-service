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
let client: SupabaseClient | null | undefined;
export function shopDb(): SupabaseClient | null {
  if (client === undefined) {
    const url = (process.env.SHOP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
    const key = process.env.SUPABASE_SECRET_KEY?.trim();
    client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  }
  return client;
}

export const closed = () =>
  Response.json({ error: "ร้านยังไม่เปิดรับออร์เดอร์ออนไลน์" }, { status: 503 });

export type ShopSettings = {
  shop_name: string;
  promptpay_id: string;
  cutoff_hour: number;
  open_days: number[];
  pickup_slots: string[];
};

export async function readSettings(db: SupabaseClient): Promise<ShopSettings | null> {
  const { data, error } = await db
    .from("shop_settings")
    .select("shop_name, promptpay_id, cutoff_hour, open_days, pickup_slots")
    .eq("id", 1)
    .maybeSingle();
  // ไม่งั้นหน้าร้านขึ้นแค่ "ยังไม่เปิด" แล้วไม่รู้ว่าเพราะ key ผิดหรือยังไม่ใส่พร้อมเพย์
  if (error) console.error("[shop] readSettings:", error.message);
  return data;
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

/** token ลูกค้าจาก header — uuid เท่านั้น */
export function readToken(req: Request): string | null {
  const t = req.headers.get("x-shop-token")?.trim() ?? "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t) ? t : null;
}
