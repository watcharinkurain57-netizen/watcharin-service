import { createHash, randomBytes } from "node:crypto";
import { SESSION_DAYS, createSession, readCookie, sessionCookie } from "@/lib/shop/admin.server";
import { SITE } from "@/lib/shop/richmenu";
import { shopDb, shopSupabaseEnv } from "@/lib/shop/shop.server";

/**
 * เข้าหลังบ้านด้วยบัญชี Google — ผ่าน Supabase Auth ของโปรเจกต์ร้าน (ใช้ Google OAuth client ที่ตั้งไว้ใน Supabase แล้ว)
 * เข้าได้เฉพาะบัญชีที่อยู่ในตาราง app_admins (แอดมินเว็บ) ไม่มีรายชื่อในโค้ด
 *
 * GET (ไม่มี code)  → ไปหน้าเลือกบัญชี Google (PKCE: เก็บ verifier ในคุกกี้ 10 นาที)
 * GET ?code=…      → Supabase ส่งกลับมา: แลก code → ได้ผู้ใช้ → เช็ก app_admins → คุกกี้หลังบ้าน 30 วัน
 * token ของ Supabase อยู่แค่ในเซิร์ฟเวอร์ และถูกยกเลิกทันทีหลังเช็กเสร็จ (ไม่ได้ล็อกอินส่วนอื่นของเว็บ)
 * ผลลัพธ์กลับไปที่ /shop/admin?google=<ok|denied|cancelled|failed> (ไม่มีข้อมูลส่วนตัวใน URL)
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PKCE_COOKIE = "shop_admin_pkce";
const PKCE_PATH = "/api/shop/admin/google";
const VERIFIER_RE = /^[A-Za-z0-9_-]{43,128}$/;

const pkceCookie = (v: string, maxAge: number) =>
  `${PKCE_COOKIE}=${v}; Path=${PKCE_PATH}; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

/** เว็บจริงใช้โดเมนร้านเสมอ · Preview/เครื่องตัวเองใช้โดเมนที่เปิดอยู่ */
function base(req: Request): string {
  return process.env.VERCEL_ENV === "production" ? SITE : new URL(req.url).origin;
}

function back(req: Request, result: string, cookies: string[] = []): Response {
  const headers = new Headers({ Location: `${base(req)}/shop/admin?google=${result}`, "Cache-Control": "no-store" });
  for (const c of [...cookies, pkceCookie("", 0)]) headers.append("Set-Cookie", c);
  return new Response(null, { status: 303, headers });
}

type TokenReply = { access_token?: string; user?: { id?: string } };

export async function GET(req: Request) {
  const env = shopSupabaseEnv();
  const db = shopDb();
  if (!env || !db) return back(req, "failed");
  const q = new URL(req.url).searchParams;

  // Google/Supabase ตอบ error (เช่น กดยกเลิก)
  if (q.get("error") || q.get("error_description")) return back(req, "cancelled");

  const code = q.get("code");
  if (!code) {
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const authorize = new URL(`${env.url}/auth/v1/authorize`);
    authorize.searchParams.set("provider", "google");
    authorize.searchParams.set("redirect_to", `${base(req)}${PKCE_PATH}`);
    authorize.searchParams.set("code_challenge", challenge);
    authorize.searchParams.set("code_challenge_method", "s256");
    // ให้เลือกบัญชีทุกครั้ง (เครื่องที่ล็อกอิน Google ไว้หลายบัญชี)
    authorize.searchParams.set("prompt", "select_account");
    const headers = new Headers({ Location: authorize.toString(), "Cache-Control": "no-store" });
    headers.append("Set-Cookie", pkceCookie(verifier, 600));
    return new Response(null, { status: 303, headers });
  }

  const verifier = readCookie(req, PKCE_COOKIE);
  if (!VERIFIER_RE.test(verifier) || code.length > 500) return back(req, "failed");

  // แลก code เป็นผู้ใช้ (ต้องมี verifier ตัวเดียวกับตอนเริ่ม — คนอื่นเอา code ไปใช้แทนไม่ได้)
  let userId = "";
  let access = "";
  try {
    const res = await fetch(`${env.url}/auth/v1/token?grant_type=pkce`, {
      method: "POST",
      headers: { apikey: env.key, "Content-Type": "application/json" },
      body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => null)) as TokenReply | null;
    if (!res.ok || !body?.access_token || !body.user?.id) {
      console.error("[shop] admin google exchange:", res.status);
      return back(req, "failed");
    }
    userId = body.user.id;
    access = body.access_token;
  } catch (e) {
    console.error("[shop] admin google exchange:", (e as Error).message);
    return back(req, "failed");
  }

  // ไม่ใช้ session ของ Supabase ต่อ — ยกเลิกทิ้งทันที
  try {
    const res = await fetch(`${env.url}/auth/v1/logout?scope=local`, {
      method: "POST",
      headers: { apikey: env.key, Authorization: `Bearer ${access}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    await res.arrayBuffer().catch(() => {});
  } catch (e) {
    console.error("[shop] admin google logout:", (e as Error).message);
  }

  const { data: admin, error } = await db.from("app_admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (error) {
    console.error("[shop] admin google check:", error.message);
    return back(req, "failed");
  }
  if (!admin) return back(req, "denied");

  const session = await createSession(db);
  if (!session) return back(req, "failed");
  return back(req, "ok", [sessionCookie(session, SESSION_DAYS * 86400)]);
}
