import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Omise (Opn Payments) — PromptPay ที่รู้เองว่าเงินเข้า
 *
 * ใช้แค่ secret key ฝั่งเซิร์ฟเวอร์ (OMISE_SECRET_KEY) ไม่มี public key ในเบราว์เซอร์
 * เพราะสร้าง charge แบบ source[type]=promptpay ได้ในคำขอเดียวจากเซิร์ฟเวอร์
 *
 * ไม่ตั้งคีย์ = ร้านกลับไปใช้ QR พร้อมเพย์ของตัวเองแบบเดิม (เจ้าของร้านเช็กยอดเอง)
 * skey_test_… = โหมดทดสอบ: กด "Mark as successful" ใน dashboard ของ Omise แทนการโอนจริง
 */
const API = "https://api.omise.co";

export function omiseEnabled(): boolean {
  return Boolean(process.env.OMISE_SECRET_KEY?.trim());
}

function auth(): string {
  return "Basic " + Buffer.from(`${process.env.OMISE_SECRET_KEY!.trim()}:`).toString("base64");
}

export type OmiseCharge = {
  id: string;
  status: "pending" | "successful" | "failed" | "expired" | string;
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
  source?: { scannable_code?: { image?: { download_uri?: string } } };
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    headers: { Authorization: auth(), ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const body = await res.json();
  if (!res.ok || body.object === "error") {
    throw new Error(`omise ${res.status}: ${body.code ?? ""} ${body.message ?? ""}`.trim());
  }
  return body as T;
}

/** amount เป็นบาท (Omise รับสตางค์) · ขั้นต่ำของ PromptPay คือ 20 บาท */
export function createPromptPayCharge(amountBaht: number, orderId: string, orderNo: string) {
  const form = new URLSearchParams({
    amount: String(amountBaht * 100),
    currency: "THB",
    "source[type]": "promptpay",
    description: `ออร์เดอร์ ${orderNo}`,
    "metadata[order_id]": orderId,
    "metadata[order_no]": orderNo,
    // QR หมดอายุใน 30 นาที — ลูกค้าที่ทิ้งไว้แล้วกลับมาจ่ายทีหลังจะได้ไม่จ่ายออร์เดอร์ที่เลยรอบไปแล้ว
    expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
  });
  return call<OmiseCharge>("/charges", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
}

/** ถามสถานะจาก Omise ตรง ๆ — ใช้ทั้งตอนหน้าเว็บถาม และตอนได้ webhook (ไม่เชื่อ body ของ webhook) */
export function getCharge(id: string) {
  if (!/^chrg_[a-z0-9_]+$/i.test(id)) throw new Error("bad charge id");
  return call<OmiseCharge>(`/charges/${id}`);
}

/** รูป QR ของ charge — ดึงผ่านเซิร์ฟเวอร์เรา เพราะลิงก์ของ Omise อาจต้องใช้คีย์ */
export async function fetchQrImage(charge: OmiseCharge): Promise<Response | null> {
  const uri = charge.source?.scannable_code?.image?.download_uri;
  if (!uri?.startsWith(API + "/")) return null;
  const res = await fetch(uri, { headers: { Authorization: auth() }, cache: "no-store" });
  if (!res.ok) return null;
  return new Response(await res.arrayBuffer(), {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "image/svg+xml",
      "Cache-Control": "private, max-age=1800",
    },
  });
}


export type PaidResult = {
  orderNo: string;
  code: string;
  pickupDate: string;
  slot: string;
  total: number;
  earned: number;
  points: number;
  paymentStatus: "paid";
};

/**
 * charge ที่ Omise ยืนยันว่า successful → ยืนยันออร์เดอร์ในฐานข้อมูล
 * ใช้ order_id จาก metadata ที่เราใส่ตอนสร้าง charge และให้ shop_confirm_payment()
 * เทียบ charge_id + ยอดเงินกับออร์เดอร์อีกชั้น — เรียกซ้ำได้ ไม่นับแต้มซ้ำ
 */
export async function confirmFromCharge(db: SupabaseClient, charge: OmiseCharge): Promise<PaidResult | null> {
  if (charge.status !== "successful" || charge.currency.toUpperCase() !== "THB") return null;
  const orderId = charge.metadata?.order_id;
  if (!orderId) return null;
  const { data, error } = await db.rpc("shop_confirm_payment", {
    p_order_id: orderId,
    p_charge_id: charge.id,
    p_amount: charge.amount,
  });
  if (error) {
    console.error("[shop] confirm_payment:", charge.id, error.message);
    return null;
  }
  return data as PaidResult;
}
