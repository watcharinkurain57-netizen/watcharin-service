/**
 * งวดจ่ายของโปรเจกต์
 *
 * ⚠️⚠️ ตารางนี้ **ลูกค้าเห็นด้วย** (capability `project.invoice.view`)
 * ห้ามมีต้นทุน กำไร หรือเรทที่คิดจริงเด็ดขาด — ถ้าวันหนึ่งต้องเก็บตัวเลขพวกนั้น
 * ให้สร้างตารางแยกที่เปิดเฉพาะเจ้าของ คู่กับ `project.finance.view`
 * (Postgres คุมสิทธิ์ระดับแถวได้ แต่คุมระดับคอลัมน์ได้ลำบาก)
 */

export type PaymentStatus = "paid" | "pending" | "overdue";

export type ProjectPayment = {
  id: string;
  label: string;
  amount: number;
  status: PaymentStatus;
  /**
   * ข้อความกำหนดชำระแบบที่แสดงจริง เช่น 'รอส่งมอบ' 'สิ้นเดือน'
   * เก็บเป็นข้อความไม่ใช่ date ด้วยเหตุผลเดียวกับ due_label ของงาน:
   * เดือนไทยของ Intl ให้ พ.ศ. ซึ่งไม่ตรงกับที่ใช้อยู่
   */
  due_label: string | null;
  /** อันนี้เป็นวันที่จริง เพราะเป็นข้อเท็จจริงว่าเงินเข้าวันไหน ไม่ใช่ข้อความที่ตั้งเอง */
  paid_on: string | null;
  sort: number;
};

export const PAYMENT_SELECT = "id, label, amount, status, due_label, paid_on, sort";

export const PAYMENT_STATUSES: { id: PaymentStatus; label: string; tone: string }[] = [
  { id: "pending", label: "รอจ่าย", tone: "text-amber-400" },
  { id: "paid", label: "จ่ายแล้ว", tone: "text-brand-400" },
  { id: "overdue", label: "เลยกำหนด", tone: "text-red-400" },
];

export function statusOf(id: PaymentStatus) {
  return PAYMENT_STATUSES.find((s) => s.id === id) ?? PAYMENT_STATUSES[0];
}

/**
 * จำนวนเงินแบบไทย — โชว์ทศนิยมเฉพาะตอนที่มีจริง
 *
 * คอลัมน์เป็น numeric(12,2) ถ้าปัดทิ้งเสมอ ยอด 1,234.56 จะกลายเป็น 1,235
 * ซึ่งเป็นตัวเลขเงินที่ผิด และลูกค้าเอาไปกระทบยอดกับสลิปไม่ได้
 */
export function baht(value: number | string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";

  const hasDecimals = Math.abs(n % 1) > 0.004;
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export type PaymentTotals = { all: number; paid: number; left: number; overdue: number };

export function totalsOf(rows: ProjectPayment[]): PaymentTotals {
  const sum = (list: ProjectPayment[]) => list.reduce((s, p) => s + Number(p.amount), 0);
  return {
    all: sum(rows),
    paid: sum(rows.filter((p) => p.status === "paid")),
    left: sum(rows.filter((p) => p.status !== "paid")),
    overdue: sum(rows.filter((p) => p.status === "overdue")),
  };
}

/**
 * แปลงข้อความในช่องจำนวนเงินเป็นตัวเลข
 *
 * คนกรอกเงินมักพิมพ์ '24,000' หรือ '24,000 บาท' ติดมาจากที่อื่น
 * ถ้าไม่รับรูปแบบพวกนี้จะได้ NaN แล้วบันทึกไม่ลงโดยไม่บอกว่าเพราะอะไร
 */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[,\s฿]/g, "").replace(/บาท/g, "");
  if (cleaned === "") return null;

  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;

  // numeric(12,2) รับได้ถึง 10 หลักหน้าจุด เกินนั้น Postgres จะปฏิเสธ
  if (n > 9_999_999_999) return null;

  return Math.round(n * 100) / 100;
}

/* ==========================================================================
 * รายการที่เรียกเก็บ — แจกแจงว่าเก็บค่าอะไรบ้าง
 *
 * คนละเรื่องกับงวดจ่าย: งวดจ่ายตอบว่า "แบ่งจ่ายยังไง"
 * ตารางนี้ตอบว่า "เก็บค่าอะไร"
 *
 * ⚠️ ลูกค้าเห็นด้วยเหมือนกัน — เป็นราคาที่เรียกเก็บ ไม่ใช่ต้นทุนที่เราจ่าย
 * ========================================================================== */

export type ChargeCategory = "hardware" | "software" | "subscription" | "service" | "other";

export type ProjectCharge = {
  id: string;
  category: ChargeCategory;
  label: string;
  qty: number;
  unit_amount: number;
  /** null = จ่ายครั้งเดียว · มีค่า = ของรายเดือน คิดกี่เดือน */
  months: number | null;
  note: string | null;
  /** คอลัมน์คำนวณจาก DB — unit_amount × qty × coalesce(months, 1) */
  total: number;
  sort: number;
};

export const CHARGE_SELECT = "id, category, label, qty, unit_amount, months, note, total, sort";

export const CHARGE_CATEGORIES: { id: ChargeCategory; label: string; tone: string }[] = [
  { id: "hardware", label: "ฮาร์ดแวร์", tone: "bg-sky-400/15 text-sky-200" },
  { id: "software", label: "ซอฟต์แวร์ / ไลเซนส์", tone: "bg-violet-400/15 text-violet-200" },
  { id: "subscription", label: "ค่าบริการรายเดือน", tone: "bg-amber-400/15 text-amber-200" },
  { id: "service", label: "ค่าดำเนินการ", tone: "bg-brand-500/15 text-brand-300" },
  { id: "other", label: "อื่น ๆ", tone: "bg-line-strong/40 text-ink-muted" },
];

export function categoryOf(id: ChargeCategory) {
  return CHARGE_CATEGORIES.find((c) => c.id === id) ?? CHARGE_CATEGORIES[4];
}

/**
 * ยอดรวมของแถว — คิดแบบเดียวกับคอลัมน์ generated ใน 0011
 * ใช้ตอนพรีวิวในฟอร์มก่อนบันทึก ซึ่งยังไม่มีค่าจาก DB ให้อ่าน
 */
export function chargeTotal(unitAmount: number, qty: number, months: number | null): number {
  return Math.round(unitAmount * qty * (months ?? 1) * 100) / 100;
}

/** รวมยอดแยกตามหมวด เรียงจากมากไปน้อย — ใช้ทำแถบสรุป */
export function byCategory(rows: ProjectCharge[]): { id: ChargeCategory; label: string; tone: string; total: number }[] {
  return CHARGE_CATEGORIES.map((c) => ({
    ...c,
    total: rows.filter((r) => r.category === c.id).reduce((s, r) => s + Number(r.total), 0),
  }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
}

export function chargesTotal(rows: ProjectCharge[]): number {
  return rows.reduce((s, r) => s + Number(r.total), 0);
}

/** จำนวนชิ้น/เดือน — ยอมให้เป็นทศนิยมเพราะค่าแรงคิด 1.5 วันก็มี */
export function parseQty(raw: string): number | null {
  const n = Number(raw.replace(/[,\s]/g, ""));
  if (!Number.isFinite(n) || n <= 0 || n > 99_999_999) return null;
  return Math.round(n * 100) / 100;
}

/** จำนวนเดือน — ว่าง = ไม่ใช่ของรายเดือน จึงต้องแยก null ออกจาก "กรอกผิด" */
export function parseMonths(raw: string): { ok: true; value: number | null } | { ok: false } {
  const t = raw.trim();
  if (t === "") return { ok: true, value: null };

  const n = Number(t);
  if (!Number.isInteger(n) || n <= 0 || n > 600) return { ok: false };
  return { ok: true, value: n };
}

export function paymentErrorMessage(error: { code?: string; message?: string } | null, fallback: string): string {
  if (error?.code === "42501") return "แก้งวดจ่ายได้เฉพาะเจ้าของโปรเจกต์";
  if (error?.code === "23514") return "จำนวนเงินติดลบไม่ได้";
  if (error?.code === "22003") return "จำนวนเงินมากเกินกว่าที่เก็บได้";
  return error?.message || fallback;
}
