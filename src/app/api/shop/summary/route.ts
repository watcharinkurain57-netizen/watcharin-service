import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  bangkokDate,
  bangkokHour,
  branchSlug,
  pickupLabel,
  readBranches,
  shopDb,
  type ShopBranch,
} from "@/lib/shop/shop.server";
import { buildCommunityPost, buildSummary, type SummaryRow } from "@/lib/shop/summary";

/**
 * สรุปออร์เดอร์ตอนปิดรับของแต่ละสาขา — pg_cron เรียกทุกชั่วโมง นาทีที่ 5 (supabase/cron_shop_summary.sql)
 * สาขาที่เวลาปิดรับ (cutoff_hour) ตรงกับชั่วโมงนี้ → สรุปออร์เดอร์ที่รับของพรุ่งนี้ของสาขานั้น
 * (ออร์เดอร์ของวัน P ปิดรับตอน cutoff ของวันก่อนหน้า P เสมอ ดู shop_branch_pickup ใน 0027)
 * ไม่มีคนสั่ง = ไม่ส่งอะไร
 *
 * ส่งผ่านไลน์ของสาขานั้น: SHOP_LINE_TOKEN_<SLUG> + SHOP_LINE_TO_<SLUG>
 *   SLUG ตัวใหญ่ ขีดเป็นขีดล่าง เช่น shinawatra3 → SHOP_LINE_TOKEN_SHINAWATRA3
 *   ไม่ตั้งของสาขา = ใช้ตัวกลาง SHOP_LINE_CHANNEL_TOKEN + SHOP_LINE_TO
 *   ผู้รับใส่ได้หลายคน คั่นด้วยจุลภาค · ผู้รับต้องแอดไลน์ของสาขานั้นเป็นเพื่อนก่อน ไม่งั้นไลน์ไม่ส่งให้
 * และ/หรืออีเมล (RESEND_API_KEY + RESEND_FROM + SHOP_SUMMARY_EMAIL)
 *
 * ทดสอบเองไม่ต้องรอเวลา: ?branch=<slug> (ส่งเลย) และ &date=YYYY-MM-DD (ไม่ใส่ = พรุ่งนี้)
 *
 * ⚠️ กันด้วย CRON_SECRET ตัวเดียวกับ meeting-reminders ไม่ตั้ง = ปฏิเสธทุกคำขอ
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** คีย์ไลน์ของสาขา — ไม่ตั้งแยก ใช้ตัวกลาง (สาขาแรกที่ตั้งไว้ก่อนมีระบบสาขา) */
function lineFor(slug: string) {
  const key = slug.toUpperCase().replace(/-/g, "_");
  const token = (process.env[`SHOP_LINE_TOKEN_${key}`] || process.env.SHOP_LINE_CHANNEL_TOKEN || "").trim();
  const to = (process.env[`SHOP_LINE_TO_${key}`] || process.env.SHOP_LINE_TO || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return { token, to };
}

type Result = { branch: string; orders: number; sent: string[]; failed: string[] };

async function summarize(db: SupabaseClient, b: ShopBranch, date: string): Promise<Result> {
  const result: Result = { branch: b.slug, orders: 0, sent: [], failed: [] };
  const { data, error } = await db
    .from("shop_orders")
    .select("order_no, nickname, pickup_slot, items, total, discount, payment_checked")
    .eq("branch_id", b.id)
    .eq("pickup_date", date)
    .neq("status", "cancelled")
    // ออร์เดอร์ที่สร้าง QR Omise แล้วไม่จ่าย ค้างเป็น pending — ไม่ต้องเตรียมของ
    .eq("payment_status", "paid")
    .order("pickup_slot")
    .order("order_no");
  if (error) {
    console.error("[shop] summary:", b.slug, error.message);
    result.failed.push("db");
    return result;
  }
  result.orders = data.length;
  if (!data.length) return result;

  const rows = data as SummaryRow[];
  const label = pickupLabel(date);
  const text = buildSummary(label, rows, b.name);

  const line = lineFor(b.slug);
  if (line.token && line.to.length) {
    const many = line.to.length > 1;
    const res = await fetch(`https://api.line.me/v2/bot/message/${many ? "multicast" : "push"}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${line.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        to: many ? line.to : line.to[0],
        messages: [
          { type: "text", text: text.slice(0, 4900) },
          // ข้อความที่ 2: กดค้าง → ส่งต่อ → เลือก OpenChat ของสาขา
          { type: "text", text: buildCommunityPost(label, rows, b.line_id) },
        ],
      }),
    });
    (res.ok ? result.sent : result.failed).push(`line:${res.status}`);
  }

  const mailTo = process.env.SHOP_SUMMARY_EMAIL?.trim();
  if (mailTo && process.env.RESEND_API_KEY && process.env.RESEND_FROM) {
    const { error: mailError } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.RESEND_FROM,
      to: mailTo,
      subject: `สรุปออร์เดอร์ สาขา${b.name} รับ${label}`,
      text,
    });
    (mailError ? result.failed : result.sent).push("email");
  }

  // มีออร์เดอร์แต่ไม่ได้ตั้งช่องทางส่งเลย — ให้ cron ขึ้นว่าล้มเหลว เจ้าของร้านจะได้รู้
  if (!result.sent.length && !result.failed.length) result.failed.push("no-channel");
  return result;
}

async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "ยังไม่ได้ตั้ง CRON_SECRET" }, { status: 503 });
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ") || !safeEqual(auth.slice(7), secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = shopDb();
  if (!db) return Response.json({ error: "ยังไม่ได้ตั้ง SUPABASE_SECRET_KEY" }, { status: 503 });

  const q = new URL(req.url).searchParams;
  const only = branchSlug(q.get("branch"));
  const date = q.get("date")?.trim() ?? "";
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "date ต้องเป็น YYYY-MM-DD" }, { status: 400 });
  }

  const branches = await readBranches(db);
  const hour = bangkokHour();
  const due = only ? branches.filter((b) => b.slug === only) : branches.filter((b) => b.cutoff_hour === hour);
  if (only && !due.length) return Response.json({ error: "ไม่พบสาขานี้" }, { status: 404 });

  const pickup = date || bangkokDate(1);
  const results: Result[] = [];
  for (const b of due) results.push(await summarize(db, b, pickup));

  const failed = results.some((r) => r.failed.length);
  return Response.json({ date: pickup, hour, branches: results }, { status: failed ? 502 : 200 });
}

export const POST = handle;
export const GET = handle;
