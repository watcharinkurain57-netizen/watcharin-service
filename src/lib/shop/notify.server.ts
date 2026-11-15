import "server-only";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lineFor } from "./line.server";
import { bangkokDate, pickupLabel } from "./shop.server";
import { buildOrderNotice, type SummaryRow } from "./summary";

/**
 * แจ้งเข้าไลน์ทุกออร์เดอร์ (0032) — สาขาที่เปิด shop_branches.notify_orders
 * ออร์เดอร์ที่จ่ายแล้ว (QR ของร้าน: ลูกค้ากด "โอนแล้ว" · Omise: เงินเข้า) → หนึ่งข้อความถึงผู้รับสรุปของสาขา
 * ทางเดียวกับสรุปรายวัน (SHOP_LINE_TOKEN_<SLUG> + SHOP_LINE_TO_<SLUG>) ไม่ต้องตั้งอะไรเพิ่ม
 *
 * ส่งครั้งเดียวต่อออร์เดอร์ (shop_orders.notified_at) · โควตาไลน์ใกล้หมด = ไม่แจ้งรายออร์เดอร์
 * เก็บไว้ให้สรุปรายวันส่งได้ถึงสิ้นเดือน · ส่งไม่ได้ก็ไม่กระทบออร์เดอร์ (สรุปรายวันยังมีครบ)
 */

const LINE_MS = 8_000;

export type NoticeResult = "sent" | "off" | "skip" | "no-line" | "quota" | "failed";

/** วันที่เหลือในเดือนนี้ รวมวันนี้ (เวลาไทย) */
export function daysLeftInMonth(today: string): number {
  const [y, m, d] = today.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return last - d + 1;
}

/** โควตาที่ต้องเหลือไว้: สรุปวันละครั้งถึงสิ้นเดือน (+1 เผื่อ) ทุกผู้รับ + ลิงก์เข้าหลังบ้าน 5 ครั้ง */
export function quotaReserve(recipients: number, today: string): number {
  return recipients * (daysLeftInMonth(today) + 1) + 5;
}

async function lineGet(url: string, token: string): Promise<Record<string, unknown> | null> {
  // ใส่ signal ทุกครั้ง — fetch ของ Next.js บน Vercel ค้างได้ถ้า GET ไม่มี signal (ดู summary route)
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(LINE_MS),
  });
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  return res.ok ? body : null;
}

/** ข้อความที่ยังส่งได้เดือนนี้ · ไม่จำกัด = Infinity · ถามไลน์ไม่ได้ = null (ไม่รู้) */
export async function quotaLeft(token: string): Promise<number | null> {
  try {
    const [q, used] = await Promise.all([
      lineGet("https://api.line.me/v2/bot/message/quota", token),
      lineGet("https://api.line.me/v2/bot/message/quota/consumption", token),
    ]);
    if (q?.type === "none") return Infinity;
    const limit = Number(q?.value);
    const total = Number(used?.totalUsage);
    if (q?.type !== "limited" || !Number.isFinite(limit) || !Number.isFinite(total)) return null;
    return limit - total;
  } catch (e) {
    console.error("[shop] line quota:", (e as Error).name);
    return null;
  }
}

async function push(token: string, to: string[], text: string): Promise<{ ok: boolean; status: number; error: string }> {
  const many = to.length > 1;
  const res = await fetch(`https://api.line.me/v2/bot/message/${many ? "multicast" : "push"}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to: many ? to : to[0], messages: [{ type: "text", text }] }),
    signal: AbortSignal.timeout(LINE_MS),
  });
  if (res.ok) return { ok: true, status: res.status, error: "" };
  const body = (await res.json().catch(() => null)) as { message?: string } | null;
  return { ok: false, status: res.status, error: body?.message ?? "" };
}

const ORDER_COLS =
  "id, order_no, nickname, pickup_date, pickup_slot, items, total, discount, payment_checked, payment_status, status, notified_at, branch_id, delivery_address, delivery_phone, delivery_map";

type OrderRow = SummaryRow & {
  id: string;
  pickup_date: string;
  payment_status: string;
  status: string;
  notified_at: string | null;
  branch_id: string;
};

/** ส่งแจ้งออร์เดอร์นี้ (ถ้าสาขาเปิดไว้) — เรียกซ้ำได้ ส่งครั้งเดียว */
export async function notifyOrder(db: SupabaseClient, orderId: string, now = Date.now()): Promise<NoticeResult> {
  const { data: order, error } = await db.from("shop_orders").select(ORDER_COLS).eq("id", orderId).maybeSingle<OrderRow>();
  if (error) throw new Error(error.message);
  if (!order || order.payment_status !== "paid" || order.status === "cancelled" || order.notified_at) return "skip";

  const { data: branch, error: e2 } = await db
    .from("shop_branches")
    .select("slug, name, delivery, notify_orders")
    .eq("id", order.branch_id)
    .maybeSingle<{ slug: string; name: string; delivery: boolean; notify_orders: boolean }>();
  if (e2) throw new Error(e2.message);
  if (!branch?.notify_orders) return "off";

  const line = lineFor(branch.slug);
  if (!line.token || !line.to.length) return "no-line";

  const left = await quotaLeft(line.token);
  if (left !== null && left - line.to.length < quotaReserve(line.to.length, bangkokDate(0, now))) {
    console.error("[shop] order notice: quota kept for daily summary", branch.slug, left);
    return "quota";
  }

  // จองก่อนส่ง — สองทางยืนยันพร้อมกัน ทางเดียวได้ส่ง
  const claim = await db
    .from("shop_orders")
    .update({ notified_at: new Date(now).toISOString() })
    .eq("id", order.id)
    .is("notified_at", null)
    .select("id");
  if (claim.error) throw new Error(claim.error.message);
  if (!claim.data?.length) return "skip";

  const text = buildOrderNotice(order, pickupLabel(order.pickup_date), branch.name, branch.delivery);
  let r: { ok: boolean; status: number; error: string };
  try {
    r = await push(line.token, line.to, text.slice(0, 4900));
  } catch (e) {
    r = { ok: false, status: 0, error: (e as Error).name };
  }
  if (r.ok) return "sent";
  console.error("[shop] order notice line:", branch.slug, r.status, r.error);
  // ส่งไม่ได้ — ปล่อยให้ลองใหม่ได้ถ้ามีการยืนยันซ้ำ (ออร์เดอร์ยังอยู่ในสรุปรายวันเสมอ)
  await db.from("shop_orders").update({ notified_at: null }).eq("id", order.id);
  return "failed";
}

/**
 * แจ้งหลังตอบลูกค้าแล้ว — ลูกค้าไม่ต้องรอไลน์ · ผิดพลาดตรงนี้ไม่กระทบออร์เดอร์
 * นอก request (เช่นสคริปต์ทดสอบ) after() ใช้ไม่ได้ ก็ส่งเลย
 */
export function notifyLater(db: SupabaseClient, orderId: string): void {
  const task = () =>
    notifyOrder(db, orderId).catch((e) => {
      console.error("[shop] order notice:", (e as Error).message);
      return "failed" as const;
    });
  try {
    after(task);
  } catch {
    void task();
  }
}
