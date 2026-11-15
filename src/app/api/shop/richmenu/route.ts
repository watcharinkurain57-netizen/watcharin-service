import { bearer, cronAuthorized, lineFor } from "@/lib/shop/line.server";
import { RICH_MENU_IMAGE, orderLink, richMenuFor } from "@/lib/shop/richmenu";
import { branchSlug, readBranches, shopDb, type ShopBranch } from "@/lib/shop/shop.server";

/**
 * ตั้งเมนูไลน์ (Rich menu) "สั่งอาหาร | ทักแอดมิน" ให้ไลน์ของทุกสาขา ผ่าน Messaging API
 * เจ้าของร้านไม่ต้องเข้า LINE Official Account Manager เอง
 *
 * POST /api/shop/richmenu [?branch=<slug>] [&dry=1]
 *   กันด้วยรหัสลับแบบเดียวกับ /api/shop/summary (shop_cron_secret ใน Vault หรือ CRON_SECRET)
 *   dry=1 = เช็กอย่างเดียว (token เป็นของไลน์สาขานั้น รูปโหลดได้ ไลน์รับหน้าตาเมนู) ไม่เปลี่ยนอะไร
 *   รันซ้ำได้: สร้างเมนูใหม่ ตั้งเป็นเมนูหลัก แล้วลบเมนูเก่าของสาขาเดียวกันที่ระบบนี้เคยสร้าง
 *   รันใหม่เมื่อใส่ LIFF ID ของสาขา (ปุ่มจะเปลี่ยนไปเปิดผ่าน LIFF) หรือเพิ่มสาขา
 *
 * ใช้ได้เฉพาะ token ของไลน์สาขานั้นเอง (SHOP_LINE_TOKEN_<SLUG> หรือตัวกลางของสาขาแรก)
 * ถ้าสาขาไหนยังยืม token ของสาขาอื่น จะไม่ตั้งให้ ไม่งั้นเมนูไปทับไลน์ของสาขาอื่น
 * และเช็กกับไลน์ก่อนว่า token เป็นของ line_id ของสาขานั้นจริง
 *
 * เมนูที่ตั้งผ่าน API ขึ้นแทนเมนูที่ตั้งใน LINE Official Account Manager
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API = "https://api.line.me/v2/bot";
const DATA_API = "https://api-data.line.me/v2/bot";
const MAX_IMAGE = 1024 * 1024; // ไลน์รับรูปเมนูไม่เกิน 1 MB

type Call = { status: number; json: unknown };

/** เรียกไลน์ทุกครั้งมี signal (ตัว fetch ของ Next.js บน Vercel จะไม่แอบก๊อปคำตอบ) และอ่านคำตอบให้จบ */
async function line(token: string, method: string, url: string, body?: BodyInit, type?: string): Promise<Call> {
  try {
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(type ? { "Content-Type": type } : {}) },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text().catch(() => "");
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: res.status, json };
  } catch (e) {
    console.error("[shop] richmenu LINE:", (e as Error).message);
    return { status: 0, json: null };
  }
}

/** สถานะ + ข้อความจากไลน์ (ไม่มีค่า token) */
function why(r: Call): string {
  const msg = (r.json as { message?: string } | null)?.message;
  return r.status === 0 ? "ไลน์ไม่ตอบ" : `${r.status}${msg ? ` ${msg}` : ""}`;
}

type Out = { branch: string; ok: boolean; link: string; richMenuId?: string; removed?: number; error?: string };

async function loadImage(): Promise<{ bytes: Uint8Array | null; error?: string }> {
  try {
    const res = await fetch(RICH_MENU_IMAGE, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    const buf = new Uint8Array(await res.arrayBuffer());
    if (!res.ok) return { bytes: null, error: `รูปเมนูโหลดไม่ได้ (${res.status}) ${RICH_MENU_IMAGE}` };
    if (!(res.headers.get("content-type") ?? "").startsWith("image/jpeg")) {
      return { bytes: null, error: `รูปเมนูไม่ใช่ JPEG ${RICH_MENU_IMAGE}` };
    }
    if (buf.byteLength > MAX_IMAGE) return { bytes: null, error: `รูปเมนูใหญ่เกิน 1 MB (${buf.byteLength} ไบต์)` };
    return { bytes: buf };
  } catch (e) {
    return { bytes: null, error: `รูปเมนูโหลดไม่ได้: ${(e as Error).message}` };
  }
}

async function setup(b: ShopBranch, all: ShopBranch[], image: Uint8Array, dry: boolean): Promise<Out> {
  const out: Out = { branch: b.slug, ok: false, link: orderLink(b) };
  const l = lineFor(b.slug);
  if (!l.token) return { ...out, error: `ยังไม่ได้ใส่ token (${l.ownVar})` };
  const own = l.tokenVar === l.ownVar || b.id === all[0]?.id;
  if (!own) return { ...out, error: `ยังไม่ได้ใส่ ${l.ownVar} ไม่ตั้งให้ เพราะจะไปทับเมนูของไลน์สาขาอื่น` };

  const info = await line(l.token, "GET", `${API}/info`);
  if (info.status !== 200) return { ...out, error: `เช็ก token ไม่ผ่าน: ${why(info)}` };
  const j = info.json as { basicId?: string; premiumId?: string } | null;
  const ids = [j?.basicId, j?.premiumId].filter((x): x is string => !!x).map((x) => x.toLowerCase());
  const want = (b.line_id ?? "").toLowerCase();
  if (!want || !ids.includes(want)) {
    return { ...out, error: `token เป็นของไลน์ ${ids[0] ?? "?"} ไม่ใช่ ${b.line_id || "(สาขายังไม่มี line_id)"}` };
  }

  const menu = JSON.stringify(richMenuFor(b));
  const v = await line(l.token, "POST", `${API}/richmenu/validate`, menu, "application/json");
  if (v.status !== 200) return { ...out, error: `ไลน์ไม่รับหน้าตาเมนู: ${why(v)}` };
  if (dry) return { ...out, ok: true };

  const created = await line(l.token, "POST", `${API}/richmenu`, menu, "application/json");
  const id = (created.json as { richMenuId?: string } | null)?.richMenuId;
  if (created.status !== 200 || !id) return { ...out, error: `สร้างเมนูไม่ผ่าน: ${why(created)}` };
  // ขั้นต่อจากนี้พัง → ลบเมนูที่เพิ่งสร้างทิ้ง ไม่ให้ค้าง
  const fail = async (step: string, r: Call): Promise<Out> => {
    await line(l.token, "DELETE", `${API}/richmenu/${id}`);
    return { ...out, error: `${step}ไม่ผ่าน: ${why(r)}` };
  };

  const up = await line(l.token, "POST", `${DATA_API}/richmenu/${id}/content`, image.slice(), "image/jpeg");
  if (up.status !== 200) return fail("อัปรูปเมนู", up);
  const def = await line(l.token, "POST", `${API}/user/all/richmenu/${id}`);
  if (def.status !== 200) return fail("ตั้งเป็นเมนูหลัก", def);

  // เมนูเก่าของสาขานี้ที่ระบบนี้เคยสร้าง (ชื่อเดียวกัน) — ลบทิ้ง
  const list = await line(l.token, "GET", `${API}/richmenu/list`);
  const name = richMenuFor(b).name;
  const old = ((list.json as { richmenus?: { richMenuId: string; name: string }[] } | null)?.richmenus ?? []).filter(
    (m) => m.name === name && m.richMenuId !== id,
  );
  let removed = 0;
  for (const m of old) {
    const d = await line(l.token, "DELETE", `${API}/richmenu/${m.richMenuId}`);
    if (d.status === 200) removed++;
  }
  return { ...out, ok: true, richMenuId: id, removed };
}

export async function POST(req: Request) {
  const db = shopDb();
  if (!(await cronAuthorized(bearer(req), db))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!db) return Response.json({ error: "ยังไม่ได้ตั้ง SUPABASE_SECRET_KEY" }, { status: 503 });

  const q = new URL(req.url).searchParams;
  const dry = q.get("dry") === "1";
  const only = branchSlug(q.get("branch"));
  const all = await readBranches(db);
  const picked = only ? all.filter((b) => b.slug === only) : all;
  if (!picked.length) return Response.json({ error: "ไม่พบสาขานี้" }, { status: 404 });

  const image = await loadImage();
  if (!image.bytes) return Response.json({ dry, error: image.error }, { status: 502 });

  const branches: Out[] = [];
  for (const b of picked) branches.push(await setup(b, all, image.bytes, dry));
  const ok = branches.every((r) => r.ok);
  return Response.json({ dry, branches }, { status: ok ? 200 : 502 });
}
