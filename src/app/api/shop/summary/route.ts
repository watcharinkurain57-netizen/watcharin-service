import { Resend } from "resend";
import { bangkokDate, pickupLabel, shopDb } from "@/lib/shop/shop.server";
import { buildSummary, type SummaryRow } from "@/lib/shop/summary";

/**
 * สรุปออร์เดอร์ 19:00 — pg_cron เรียกทุกวัน (supabase/cron_shop_summary.sql)
 * ส่งเฉพาะวันที่พรุ่งนี้มีของต้องส่ง ไม่มีคนสั่ง = ไม่ส่งอะไร
 *
 * ส่งเข้า LINE ของเจ้าของร้าน (SHOP_LINE_CHANNEL_TOKEN + SHOP_LINE_TO)
 * และ/หรืออีเมล (RESEND_API_KEY + RESEND_FROM + SHOP_SUMMARY_EMAIL) ตามที่ตั้งไว้
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

async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "ยังไม่ได้ตั้ง CRON_SECRET" }, { status: 503 });
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ") || !safeEqual(auth.slice(7), secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = shopDb();
  if (!db) return Response.json({ error: "ยังไม่ได้ตั้ง SUPABASE_SECRET_KEY" }, { status: 503 });

  const tomorrow = bangkokDate(1);
  const { data, error } = await db
    .from("shop_orders")
    .select("order_no, nickname, pickup_slot, items, total, discount, payment_checked")
    .eq("pickup_date", tomorrow)
    .neq("status", "cancelled")
    // ออร์เดอร์ที่สร้าง QR Omise แล้วไม่จ่าย ค้างเป็น pending — ไม่ต้องเตรียมของ
    .eq("payment_status", "paid")
    .order("pickup_slot")
    .order("order_no");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data.length) return Response.json({ date: tomorrow, orders: 0, sent: [] });

  const text = buildSummary(pickupLabel(tomorrow), data as SummaryRow[]);
  const sent: string[] = [];
  const failed: string[] = [];

  const lineToken = process.env.SHOP_LINE_CHANNEL_TOKEN?.trim();
  const lineTo = process.env.SHOP_LINE_TO?.trim();
  if (lineToken && lineTo) {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { Authorization: `Bearer ${lineToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to: lineTo, messages: [{ type: "text", text: text.slice(0, 4900) }] }),
    });
    (res.ok ? sent : failed).push(`line:${res.status}`);
  }

  const mailTo = process.env.SHOP_SUMMARY_EMAIL?.trim();
  if (mailTo && process.env.RESEND_API_KEY && process.env.RESEND_FROM) {
    const { error: mailError } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.RESEND_FROM,
      to: mailTo,
      subject: `สรุปออร์เดอร์ รับ${pickupLabel(tomorrow)}`,
      text,
    });
    (mailError ? failed : sent).push("email");
  }

  return Response.json({ date: tomorrow, orders: data.length, sent, failed }, { status: failed.length ? 502 : 200 });
}

export const POST = handle;
export const GET = handle;
