import {
  SESSION_DAYS,
  TOKEN_RE,
  adminAuthorized,
  json,
  newToken,
  readJson,
  sessionCookie,
  sessionToken,
  sha256,
} from "@/lib/shop/admin.server";
import { shopDb } from "@/lib/shop/shop.server";

/**
 * GET    → { admin } เข้าระบบอยู่ไหม
 * POST   { login } → ใช้ลิงก์จากไลน์ (ครั้งเดียว) แล้วได้คุกกี้ 30 วัน
 *        หน้า /shop/admin?login=… ให้กดปุ่มก่อน ไม่ใช้ตอนเปิดลิงก์ — ไลน์แอบเปิดลิงก์ไปทำตัวอย่างลิงก์
 * DELETE → ออกจากระบบ
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const db = shopDb();
  if (!db) return json({ admin: false });
  return json({ admin: await adminAuthorized(req, db) });
}

export async function POST(req: Request) {
  const db = shopDb();
  if (!db) return json({ error: "ยังไม่ได้ตั้งฐานข้อมูลของร้าน" }, 503);
  const body = await readJson(req);
  const login = typeof body?.login === "string" ? body.login : "";
  const expired = json({ error: "ลิงก์นี้ใช้ไปแล้วหรือหมดอายุ กดขอลิงก์ใหม่ได้เลย" }, 401);
  if (!TOKEN_RE.test(login)) return expired;

  const now = new Date();
  // ใช้ลิงก์ในคำสั่งเดียว — กดซ้ำ/สองเครื่องพร้อมกัน ได้แค่ครั้งเดียว
  const { data: used, error } = await db
    .from("shop_admin_tokens")
    .update({ used_at: now.toISOString() })
    .eq("token_hash", sha256(login))
    .eq("kind", "link")
    .is("used_at", null)
    .gt("expires_at", now.toISOString())
    .select("id");
  if (error) {
    console.error("[shop] admin consume:", error.message);
    return json({ error: "เข้าระบบไม่สำเร็จ ลองอีกครั้ง" }, 500);
  }
  if (!used?.length) return expired;

  const session = newToken();
  const { error: e } = await db.from("shop_admin_tokens").insert({
    kind: "session",
    token_hash: sha256(session),
    expires_at: new Date(now.getTime() + SESSION_DAYS * 86400_000).toISOString(),
  });
  if (e) {
    console.error("[shop] admin session insert:", e.message);
    return json({ error: "เข้าระบบไม่สำเร็จ ลองอีกครั้ง" }, 500);
  }
  return json({ admin: true }, 200, { "Set-Cookie": sessionCookie(session, SESSION_DAYS * 86400) });
}

export async function DELETE(req: Request) {
  const db = shopDb();
  const t = sessionToken(req);
  if (db && t) await db.from("shop_admin_tokens").delete().eq("token_hash", sha256(t)).eq("kind", "session");
  return json({ admin: false }, 200, { "Set-Cookie": sessionCookie("", 0) });
}
