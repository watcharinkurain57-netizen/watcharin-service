import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * จำลูกค้าด้วยบัญชีไลน์ (0031) — หน้าร้านที่เปิดจากปุ่มในไลน์ (LIFF) ส่ง access token ของไลน์มาใน x-line-token
 * เซิร์ฟเวอร์ถามไลน์เองว่า token นี้ออกให้ช่อง LINE Login ของร้านจริงไหม แล้วได้ userId มา
 * ไม่เชื่อ userId ที่หน้าเว็บส่งมาเอง · ไม่เก็บ token · ไม่ส่ง userId กลับไปหน้าเว็บ
 *
 * ช่อง LINE Login ของร้านอ่านจาก LIFF ID ของสาขา (LIFF ID = "<channel ID>-<สุ่ม>") ไม่ต้องตั้งค่าเพิ่ม
 */

const LINE_TOKEN_RE = /^[A-Za-z0-9._~+/=-]{20,2048}$/;
const USER_RE = /^U[0-9a-f]{32}$/;
const LINE_MS = 8_000;

/** "1657000000-AbCdEfGh" → "1657000000" · ไม่ตรงรูปแบบ = "" */
export function liffChannel(liffId: string): string {
  return /^(\d{6,20})-[A-Za-z0-9]{4,}$/.exec(liffId.trim())?.[1] ?? "";
}

/** access token ของไลน์จาก header — รูปแบบแปลก = "" */
export function readLineToken(req: Request): string {
  const t = req.headers.get("x-line-token")?.trim() ?? "";
  return LINE_TOKEN_RE.test(t) ? t : "";
}

/** ช่อง LINE Login ของทุกสาขา (+ LIFF กลางจาก env) */
export async function lineChannels(db: SupabaseClient): Promise<string[]> {
  const { data, error } = await db.from("shop_branches").select("liff_id");
  if (error) console.error("[shop] line channels:", error.message);
  const ids = [...(data ?? []).map((b) => String(b.liff_id ?? "")), process.env.NEXT_PUBLIC_SHOP_LIFF_ID ?? ""];
  return [...new Set(ids.map(liffChannel).filter(Boolean))];
}

export type LineUser = { uid: string; name: string };

/** token ที่เช็กแล้ว (เก็บแค่ hash) — สั่งต่อจากหน้าเดิมไม่ต้องถามไลน์ซ้ำ */
const seen = new Map<string, LineUser & { until: number }>();

async function getJson(url: string, init: RequestInit): Promise<{ ok: boolean; body: Record<string, unknown> | null }> {
  const res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(LINE_MS) });
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  return { ok: res.ok, body };
}

/** ถามไลน์: token นี้ของช่องร้านจริงไหม ยังไม่หมดอายุ แล้วเป็นใคร · ไม่ผ่าน/ไลน์ไม่ตอบ = null */
export async function verifyLineUser(token: string, channels: string[]): Promise<LineUser | null> {
  if (!token || !channels.length) return null;
  const key = createHash("sha256").update(token).digest("hex");
  const now = Date.now();
  const hit = seen.get(key);
  if (hit && hit.until > now) return { uid: hit.uid, name: hit.name };

  try {
    const v = await getJson(`https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(token)}`, {});
    const clientId = String(v.body?.client_id ?? "");
    const expiresIn = Number(v.body?.expires_in ?? 0);
    if (!v.ok || !channels.includes(clientId) || !(expiresIn > 0)) return null;

    const p = await getJson("https://api.line.me/v2/profile", { headers: { Authorization: `Bearer ${token}` } });
    const uid = String(p.body?.userId ?? "");
    if (!p.ok || !USER_RE.test(uid)) return null;
    const name = String(p.body?.displayName ?? "").trim().slice(0, 30);

    if (seen.size > 500) seen.clear();
    seen.set(key, { uid, name, until: now + Math.min(expiresIn * 1000, 10 * 60_000) });
    return { uid, name };
  } catch (e) {
    console.error("[shop] line verify:", (e as Error).name);
    return null;
  }
}

export type LineCustomer = { id: string; code: string; nickname: string; points: number; token: string };
const CUST_COLS = "id, code, nickname, points, token";

/**
 * บัตรลูกค้าของบัญชีไลน์นี้
 * 1. เคยผูกไว้แล้ว → บัตรนั้น
 * 2. มือถือจำบัตรที่ยังไม่ผูกกับไลน์ไหน → ผูกบัตรนั้นกับไลน์นี้
 * 3. ไม่มี → null (บัตรใหม่ผูกตอนสั่งครั้งแรก ด้วย linkLine)
 * บัตรที่มือถือจำแต่ผูกกับไลน์บัญชีอื่นแล้ว (ยืมมือถือคนอื่นสั่ง) ไม่เอามาใช้
 */
export async function lineCustomer(
  db: SupabaseClient,
  uid: string,
  phoneToken: string | null,
): Promise<LineCustomer | null> {
  const mine = await db.from("shop_customers").select(CUST_COLS).eq("line_user_id", uid).maybeSingle();
  if (mine.error) throw new Error(mine.error.message);
  if (mine.data) return mine.data as LineCustomer;
  if (!phoneToken) return null;

  const phone = await db.from("shop_customers").select(`${CUST_COLS}, line_user_id`).eq("token", phoneToken).maybeSingle();
  if (phone.error) throw new Error(phone.error.message);
  if (!phone.data || phone.data.line_user_id) return null;

  if (await linkLine(db, phoneToken, uid)) {
    const { id, code, nickname, points, token } = phone.data as LineCustomer;
    return { id, code, nickname, points, token };
  }
  // ผูกไม่ได้ (อีกเครื่องผูกไลน์นี้ไปพร้อมกัน) — ลองหาอีกรอบ
  const again = await db.from("shop_customers").select(CUST_COLS).eq("line_user_id", uid).maybeSingle();
  return (again.data as LineCustomer | null) ?? null;
}

/** ผูกบัตร (token) กับบัญชีไลน์ — เฉพาะบัตรที่ยังไม่ผูก · ชนกัน (กดพร้อมกันสองเครื่อง) = ไม่ผูก */
export async function linkLine(db: SupabaseClient, token: string, uid: string): Promise<boolean> {
  const { data, error } = await db
    .from("shop_customers")
    .update({ line_user_id: uid })
    .eq("token", token)
    .is("line_user_id", null)
    .select("id");
  if (error) {
    console.error("[shop] link line:", error.code ?? error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}
