import { LINK_MINUTES, json, newToken, sha256 } from "@/lib/shop/admin.server";
import { lineFor } from "@/lib/shop/line.server";
import { SITE } from "@/lib/shop/richmenu";
import { readBranches, shopDb } from "@/lib/shop/shop.server";

/**
 * POST /api/shop/admin/login — ส่งลิงก์เข้าหลังบ้านไปที่ไลน์ของผู้รับสรุป (SHOP_LINE_TO)
 * ผ่านไลน์ของสาขาแรก · ใครกดก็ได้ แต่ลิงก์ไปถึงแค่ไลน์ของเจ้าของร้าน
 * กันกดรัว: 2 นาทีครั้ง และไม่เกิน 5 ครั้งต่อวัน — ทุกลิงก์กินโควตาข้อความฟรีของไลน์สาขาแรก
 * (ตัวเดียวกับที่ส่งสรุป 19:00) คนนอกกดเล่นก็กินได้ไม่เกินเดือนละ ~150 ข้อความ
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GAP_MS = 2 * 60_000;
const DAY_LIMIT = 5;

async function pushText(token: string, to: string[], text: string): Promise<number> {
  const many = to.length > 1;
  try {
    const res = await fetch(`https://api.line.me/v2/bot/message/${many ? "multicast" : "push"}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to: many ? to : to[0], messages: [{ type: "text", text }] }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.text().catch(() => "");
    if (!res.ok) console.error("[shop] admin login push:", res.status, body.slice(0, 200));
    return res.status;
  } catch (e) {
    console.error("[shop] admin login push:", (e as Error).message);
    return 0;
  }
}

export async function POST(req: Request) {
  const db = shopDb();
  if (!db) return json({ error: "ยังไม่ได้ตั้งฐานข้อมูลของร้าน" }, 503);

  const branches = await readBranches(db);
  const line = branches[0] ? lineFor(branches[0].slug) : null;
  if (!line?.token || !line.to.length) {
    return json({ error: "ยังไม่ได้ตั้งไลน์ร้านหรือผู้รับสรุป ส่งลิงก์ไม่ได้" }, 503);
  }

  const now = Date.now();
  const { data: recent, error } = await db
    .from("shop_admin_tokens")
    .select("created_at")
    .eq("kind", "link")
    .gt("created_at", new Date(now - 86400_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(DAY_LIMIT + 1);
  if (error) {
    console.error("[shop] admin login:", error.message);
    return json({ error: "ส่งลิงก์ไม่สำเร็จ ลองอีกครั้ง" }, 500);
  }
  const last = recent?.[0] ? Date.parse(recent[0].created_at) : 0;
  if (now - last < GAP_MS) {
    return json({ error: "เพิ่งส่งลิงก์ไปที่ไลน์แล้ว เปิดดูในไลน์ได้เลย (ส่งใหม่ได้อีกครั้งใน 2 นาที)" }, 429);
  }
  if ((recent?.length ?? 0) >= DAY_LIMIT) return json({ error: "วันนี้ขอลิงก์ครบ 5 ครั้งแล้ว ลองพรุ่งนี้" }, 429);

  // ล้างของเก่าที่หมดอายุเกิน 1 วัน
  await db.from("shop_admin_tokens").delete().lt("expires_at", new Date(now - 86400_000).toISOString());

  const token = newToken();
  const { data: row, error: insertError } = await db
    .from("shop_admin_tokens")
    .insert({ kind: "link", token_hash: sha256(token), expires_at: new Date(now + LINK_MINUTES * 60_000).toISOString() })
    .select("id")
    .single();
  if (insertError || !row) {
    console.error("[shop] admin login insert:", insertError?.message);
    return json({ error: "ส่งลิงก์ไม่สำเร็จ ลองอีกครั้ง" }, 500);
  }

  // เว็บจริงใช้โดเมนร้านเสมอ · Preview/เครื่องตัวเองใช้โดเมนที่เปิดอยู่
  const base = process.env.VERCEL_ENV === "production" ? SITE : new URL(req.url).origin;
  const text = [
    "🔑 ลิงก์เข้าหลังบ้านร้าน (ใช้ได้ครั้งเดียว ภายใน 15 นาที)",
    `${base}/shop/admin?login=${token}`,
    "ถ้าไม่ได้กดขอเอง ไม่ต้องทำอะไร",
  ].join("\n");
  const status = await pushText(line.token, line.to, text);
  if (status !== 200) {
    await db.from("shop_admin_tokens").delete().eq("id", row.id);
    return json({ error: "ส่งลิงก์ไปที่ไลน์ไม่สำเร็จ ลองอีกครั้ง" }, 502);
  }
  return json({ sent: true });
}
