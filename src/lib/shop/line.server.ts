import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * ของที่ใช้ร่วมกันระหว่าง /api/shop/summary กับ /api/shop/richmenu
 * คีย์ไลน์ของแต่ละสาขา และรหัสลับที่ pg_cron / คนดูแลส่งมา
 */

/** ค่าที่วางใน Vercel: ตัดช่องว่างหัวท้าย เครื่องหมายคำพูด และคำว่า Bearer ที่เผลอก๊อปมาด้วย */
export function cleanToken(v: string | undefined): string {
  return (v ?? "").trim().replace(/^["']|["']$/g, "").replace(/^Bearer\s+/i, "").trim();
}

/** คีย์ไลน์ของสาขา — ไม่ตั้งแยก ใช้ตัวกลาง (สาขาแรกที่ตั้งไว้ก่อนมีระบบสาขา) */
export function lineFor(slug: string) {
  const key = slug.toUpperCase().replace(/-/g, "_");
  const ownVar = `SHOP_LINE_TOKEN_${key}`;
  const own = cleanToken(process.env[ownVar]);
  const token = own || cleanToken(process.env.SHOP_LINE_CHANNEL_TOKEN);
  const to = (process.env[`SHOP_LINE_TO_${key}`] || process.env.SHOP_LINE_TO || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return { token, to, ownVar, tokenVar: own ? ownVar : token ? "SHOP_LINE_CHANNEL_TOKEN" : "" };
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * รหัสที่ส่งมาตรงกับ CRON_SECRET บน Vercel หรือกับ shop_cron_secret ใน Vault
 * ถามฐานข้อมูลเฉพาะรหัสที่ยาวพอ (รหัสใน Vault ยาว 64 ตัว) คนยิงมั่ว ๆ เลยไม่ไปถึงฐานข้อมูล
 */
export async function cronAuthorized(token: string, db: SupabaseClient | null): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret && token && safeEqual(token, secret)) return true;
  if (!db || token.length < 32) return false;
  const { data, error } = await db.rpc("shop_cron_ok", { p_token: token });
  if (error) {
    console.error("[shop] cron auth:", error.message);
    return false;
  }
  return data === true;
}

/** Authorization: Bearer <รหัส> → รหัส (ไม่มี = "") */
export function bearer(req: Request): string {
  const auth = req.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}
