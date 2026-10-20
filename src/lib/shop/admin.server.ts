import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bearer, cronAuthorized } from "./line.server";
import { shopDb } from "./shop.server";

/**
 * เข้าหลังบ้านร้าน (/shop/admin) — ดู 0030_shop_admin.sql
 * ลิงก์ในไลน์ → คุกกี้ shop_admin (ส่งเฉพาะ /api/shop/admin/*) อายุ 30 วัน
 * หรือรหัสลับเดียวกับ cron (shop_cron_secret ใน Vault / CRON_SECRET) ไว้เช็กเว็บจริงจากฐานข้อมูล
 */

export const ADMIN_COOKIE = "shop_admin";
export const SESSION_DAYS = 30;
export const LINK_MINUTES = 15;

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
/** 32 ไบต์สุ่ม → 43 ตัวอักษร base64url */
export const newToken = () => randomBytes(32).toString("base64url");
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

/** ค่าคุกกี้ชื่อนี้จาก request ("" = ไม่มี) */
export function readCookie(req: Request, name: string): string {
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return "";
}

/** คุกกี้เข้าระบบ — maxAge 0 = ลบ */
export function sessionCookie(token: string, maxAge: number): string {
  return `${ADMIN_COOKIE}=${token}; Path=/api/shop/admin; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

/** รหัสจากคุกกี้ (ถ้ารูปแบบถูก) — ไว้ลบ session ตอนออกจากระบบ */
export function sessionToken(req: Request): string {
  const t = readCookie(req, ADMIN_COOKIE);
  return TOKEN_RE.test(t) ? t : "";
}

/** เปิด session ใหม่ 30 วัน (เก็บแค่ hash) → รหัสสำหรับใส่คุกกี้ · บันทึกไม่ได้ = null */
export async function createSession(db: SupabaseClient): Promise<string | null> {
  const session = newToken();
  const { error } = await db.from("shop_admin_tokens").insert({
    kind: "session",
    token_hash: sha256(session),
    expires_at: new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString(),
  });
  if (error) {
    console.error("[shop] admin session insert:", error.message);
    return null;
  }
  return session;
}

export async function adminAuthorized(req: Request, db: SupabaseClient): Promise<boolean> {
  const t = sessionToken(req);
  if (t) {
    const { data, error } = await db
      .from("shop_admin_tokens")
      .select("id")
      .eq("token_hash", sha256(t))
      .eq("kind", "session")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error) console.error("[shop] admin session:", error.message);
    if (data) return true;
  }
  const b = bearer(req);
  return b ? cronAuthorized(b, db) : false;
}

export const NO_STORE = { "Cache-Control": "no-store" };

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

/** ทุก route ของหลังบ้าน: ไม่มีฐานข้อมูล 503 · ไม่ได้เข้าระบบ 401 */
export async function adminGuard(req: Request): Promise<{ db: SupabaseClient } | Response> {
  const db = shopDb();
  if (!db) return json({ error: "ยังไม่ได้ตั้งฐานข้อมูลของร้าน" }, 503);
  if (!(await adminAuthorized(req, db))) return json({ error: "ยังไม่ได้เข้าระบบ" }, 401);
  return { db };
}

/** อ่าน body ของคำสั่งแก้ข้อมูล — ต้องเป็น JSON (ฟอร์มจากเว็บอื่นส่ง JSON มาไม่ได้) */
export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return null;
  try {
    const v = await req.json();
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" ที่เป็นวันจริง */
export function isDate(v: unknown): v is string {
  if (typeof v !== "string" || !DATE_RE.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** บวกวันให้ "YYYY-MM-DD" */
export function addDays(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);
}

/** คอลัมน์ออร์เดอร์ที่หลังบ้านใช้ (รวมที่อยู่ส่งของ 0029 และรหัสลูกค้า) */
export const ORDER_COLS =
  "id, order_no, branch_id, customer_id, nickname, pickup_date, pickup_slot, items, subtotal, discount, total, " +
  "points_earned, reward_used, payment_status, payment_checked, status, created_at, " +
  "delivery_address, delivery_phone, delivery_map, customer:shop_customers(code)";

export const badRequest = (error: string) => json({ error }, 400);
