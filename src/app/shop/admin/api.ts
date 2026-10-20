/** ตัวช่วยฝั่งหน้าเว็บของหลังบ้าน — เรียก /api/shop/admin/* และจัดรูปแบบตัวเลข/วันที่ */

export type Branch = {
  id: string;
  slug: string;
  code: string;
  name: string;
  line_id: string;
  liff_id: string;
  openchat_url: string;
  pickup_note: string;
  cutoff_hour: number;
  open_days: number[];
  closed_dates: string[];
  pickup_slots: string[];
  accepting: boolean;
  delivery: boolean;
  orderLink?: string;
};

export type Order = {
  id: string;
  order_no: string;
  branch_id: string;
  customer_id: string;
  nickname: string;
  pickup_date: string;
  pickup_slot: string;
  items: { name: string; qty: number; price?: number }[];
  subtotal: number;
  discount: number;
  total: number;
  points_earned: number;
  reward_used: boolean;
  payment_status: "paid" | "pending";
  payment_checked: boolean;
  status: "new" | "done" | "cancelled";
  created_at: string;
  delivery_address: string;
  delivery_phone: string;
  delivery_map: string;
  customer: { code: string } | null;
};

export type MenuItem = {
  id: string;
  sort: number;
  name: string;
  description: string;
  price: number;
  points: number;
  redeemable: boolean;
  available: boolean;
  image_url: string;
};

export type Customer = {
  id: string;
  code: string;
  nickname: string;
  points: number;
  rewards_used: number;
  total_spent: number;
  note: string;
  created_at: string;
  last_order_at: string | null;
  /** บัตรผูกกับบัญชีไลน์แล้ว (สั่งจากปุ่มในไลน์) — เปลี่ยนมือถือก็ได้แต้มเดิม */
  line: boolean;
  orders?: number;
};

/** ไม่ได้เข้าระบบ (คุกกี้หมดอายุ / ออกจากเครื่องอื่น) — หน้าหลักฟังแล้วพากลับไปหน้าเข้าระบบ */
export const authLost = typeof window === "undefined" ? null : new EventTarget();

/** รอคำตอบนานสุดเท่านี้ — เกินแล้วขึ้นข้อความพร้อมปุ่ม "ลองใหม่" แทนการค้างที่ "กำลังโหลด" */
const READ_MS = 12_000;
const WRITE_MS = 30_000;

/** ยิงหนึ่งครั้ง อ่านคำตอบจนจบภายในเวลาที่กำหนด (หมดเวลา = โยน error) */
async function once(url: string, init: RequestInit, ms: number): Promise<{ res: Response; text: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    return { res, text: await res.text() };
  } finally {
    clearTimeout(timer);
  }
}

export async function api<T>(path: string, opts: { method?: string; json?: unknown; body?: Blob; type?: string } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  } else if (opts.body) {
    headers["Content-Type"] = opts.type ?? opts.body.type;
    body = opts.body;
  }
  const method = opts.method ?? (body ? "POST" : "GET");
  const read = method === "GET";
  const init: RequestInit = { method, headers, body, cache: "no-store", credentials: "same-origin" };

  let got: { res: Response; text: string } | null = null;
  // อ่านอย่างเดียว: ไม่สำเร็จรอบแรก ลองให้เองอีกรอบ · คำสั่งแก้ข้อมูลไม่ลองซ้ำ (กันทำซ้ำสองครั้ง)
  for (let attempt = 0; !got; attempt++) {
    try {
      got = await once(`/api/shop/admin/${path}`, init, read ? READ_MS : WRITE_MS);
    } catch {
      if (read && attempt === 0) continue;
      throw new Error(
        read
          ? "โหลดไม่สำเร็จ เน็ตอาจช้าหรือหลุด กดปุ่มลองใหม่ได้เลย"
          : "ระบบตอบช้า ไม่แน่ใจว่าบันทึกแล้วหรือยัง รีเฟรชหน้านี้ดูก่อนกดอีกครั้ง",
      );
    }
  }

  let data: { error?: string } | null = null;
  try {
    data = JSON.parse(got.text) as { error?: string };
  } catch {
    /* ไม่ใช่ JSON (หน้าเออเรอร์ของเว็บ) */
  }
  if (got.res.status === 401) authLost?.dispatchEvent(new Event("lost"));
  if (!got.res.ok || !data) throw new Error(data?.error || "ทำไม่สำเร็จ ลองอีกครั้ง");
  return data as T;
}

export const baht = (n: number) => `${n.toLocaleString("th-TH")} บ.`;

const DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
export const DAY_NAMES = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];
const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** "2026-10-21" → "พ. 21 ต.ค." */
export function shortDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
}

/** วันที่ตามเวลาไทย บวก n วัน */
export function bkkDate(add = 0): string {
  return new Date(Date.now() + 7 * 3600_000 + add * 86400_000).toISOString().slice(0, 10);
}

/** เวลาแบบไทยของ timestamp (สั่งเมื่อ…) */
export function bkkDateTime(ts: string | null): string {
  if (!ts) return "-";
  const t = new Date(Date.parse(ts) + 7 * 3600_000).toISOString();
  return `${shortDate(t.slice(0, 10))} ${t.slice(11, 16)}`;
}

/** 0812345678 → 081-234-5678 */
export function phoneText(p: string): string {
  if (/^0\d{9}$/.test(p)) return `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}`;
  if (/^0\d{8}$/.test(p)) return `${p.slice(0, 2)}-${p.slice(2, 5)}-${p.slice(5)}`;
  return p;
}

export const mapUrl = (pin: string) => `https://www.google.com/maps?q=${pin}`;

/** ย่อรูปเป็น JPEG ด้านยาวไม่เกิน max ก่อนอัปโหลด (มือถือถ่ายมาหลาย MB) */
export async function shrinkImage(file: File, max = 1200): Promise<Blob> {
  const src = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((ok, fail) =>
      canvas.toBlob((b) => (b ? ok(b) : fail(new Error("ย่อรูปไม่สำเร็จ"))), "image/jpeg", 0.85),
    );
  } finally {
    URL.revokeObjectURL(src);
  }
}
