/**
 * ต้นทุนฝั่งเรา — เจ้าของโปรเจกต์เห็นคนเดียว
 *
 * ⚠️⚠️ ตารางนี้คือที่ที่ตัวเลขซึ่ง `project_payments` และ `project_charges`
 * ห้ามมี มาอยู่รวมกัน · RLS อ่านเป็น is_project_owner ไม่ใช่ is_project_member
 * (ดูเหตุผลเต็มในหัว migration 0018)
 *
 * คู่กับ capability `project.finance.view` ที่ archive-access.ts เตรียมไว้ตั้งแต่ต้น
 */

export type CostCategory = "hardware" | "software" | "subscription" | "outsource" | "labor" | "other";

export type ProjectCost = {
  id: string;
  category: CostCategory;
  label: string;
  qty: number;
  unit_amount: number;
  months: number | null;
  vendor: string | null;
  /** null = ยังไม่จ่าย ยังเป็นตัวเลขที่ตั้งไว้ */
  paid_on: string | null;
  note: string | null;
  total: number;
  sort: number;
};

export const COST_SELECT =
  "id, category, label, qty, unit_amount, months, vendor, paid_on, note, total, sort";

export const COST_CATEGORIES: { id: CostCategory; label: string; tone: string }[] = [
  { id: "hardware", label: "ฮาร์ดแวร์", tone: "bg-sky-400/15 text-sky-200" },
  { id: "software", label: "ซอฟต์แวร์ / ไลเซนส์", tone: "bg-violet-400/15 text-violet-200" },
  { id: "subscription", label: "ค่าบริการรายเดือน", tone: "bg-amber-400/15 text-amber-200" },
  { id: "outsource", label: "จ้างช่วง", tone: "bg-orange-400/15 text-orange-200" },
  { id: "labor", label: "ค่าแรงเรา", tone: "bg-brand-500/15 text-brand-300" },
  { id: "other", label: "อื่น ๆ", tone: "bg-line-strong/40 text-ink-muted" },
];

export function costCategoryOf(id: CostCategory) {
  return COST_CATEGORIES.find((c) => c.id === id) ?? COST_CATEGORIES[5];
}

export type Margin = {
  /** มูลค่างานที่เรียกเก็บทั้งหมด */
  revenue: number;
  /** เงินที่ลูกค้าจ่ายมาแล้วจริง */
  received: number;
  /** ต้นทุนที่ตั้งไว้ทั้งหมด รวมที่ยังไม่จ่าย */
  cost: number;
  /** ต้นทุนที่จ่ายออกไปแล้วจริง */
  costPaid: number;
  /** กำไรคาดการณ์ = มูลค่างาน − ต้นทุนทั้งหมด */
  profit: number;
  /** อัตรากำไร % · null เมื่อยังไม่มีมูลค่างาน (หารศูนย์ไม่ได้) */
  marginPct: number | null;
  /** เงินสดในมือตอนนี้ = รับมาแล้ว − จ่ายไปแล้ว */
  cashNow: number;
};

/**
 * สรุปกำไร
 *
 * แยก "ตั้งไว้" กับ "เกิดขึ้นจริง" ออกจากกันตั้งใจ
 * เจ้าของต้องตอบได้ทั้งสองคำถาม: งานนี้จะเหลือเท่าไหร่ (กำไรคาดการณ์)
 * และตอนนี้เงินในมือบวกหรือลบ (กระแสเงินสด) ซึ่งไม่ใช่ตัวเลขเดียวกัน
 * งานที่กำไรดีแต่จ่ายต้นทุนไปก่อนแล้วยังไม่ได้เก็บเงิน = เงินสดติดลบ
 */
export function marginOf(
  costs: ProjectCost[],
  revenue: number,
  received: number
): Margin {
  const cost = costs.reduce((s, c) => s + Number(c.total), 0);
  const costPaid = costs.filter((c) => c.paid_on).reduce((s, c) => s + Number(c.total), 0);
  const profit = revenue - cost;

  return {
    revenue,
    received,
    cost,
    costPaid,
    profit,
    marginPct: revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : null,
    cashNow: received - costPaid,
  };
}

/** รวมต้นทุนแยกตามหมวด เรียงมากไปน้อย */
export function costsByCategory(rows: ProjectCost[]) {
  return COST_CATEGORIES.map((c) => ({
    ...c,
    total: rows.filter((r) => r.category === c.id).reduce((s, r) => s + Number(r.total), 0),
  }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
}
