/**
 * The three industrial engagement tiers, single source of truth.
 *
 * Read by both the plan cards in the Industrial section and the ROI calculator's
 * package selector, so a price can never be updated in one place and stale in the
 * other.
 *
 * `priceFrom` is a starting figure, not a fixed quote — the site already promises
 * a fixed-scope quote agreed before work begins, and the FAQ says pricing is
 * per-project. Presenting these as "เริ่มต้น" keeps those statements true and
 * leaves room for scope that turns out larger than the baseline.
 */
export type IndustrialPlan = {
  id: "a" | "b" | "c";
  phase: string;
  title: string;
  /** Tailwind gradient stops for the phase label. */
  grad: string;
  blurb: string;
  points: readonly string[];
  fit: string;
  priceFrom: number;
  /** Shown as the common starting point. */
  featured?: boolean;
};

export const industrialPlans: readonly IndustrialPlan[] = [
  {
    id: "a",
    phase: "PLAN A",
    title: "Monitoring & Dashboard",
    grad: "from-amber-500 to-orange-600",
    blurb: "อ่านข้อมูลจาก PLC/sensor ขึ้น dashboard realtime + แจ้งเตือน",
    points: ["ต่อ PLC/sensor ที่มีอยู่", "Realtime dashboard + alert", "เริ่มต้นเร็ว ลงทุนต่ำ"],
    fit: "เหมาะกับ: อยากเห็นข้อมูลก่อน พิสูจน์ ROI",
    priceFrom: 300000,
  },
  {
    id: "b",
    phase: "PLAN B",
    title: "MES — Production Execution",
    grad: "from-brand-500 to-brand-600",
    blurb: "ยกระดับเป็นระบบควบคุมการผลิตเต็มรูปแบบ",
    points: ["OEE + downtime tracking", "QC + traceability ราย lot", "Work order / การผลิตราย line"],
    fit: "เหมาะกับ: อยากคุมคุณภาพและประสิทธิภาพการผลิต",
    priceFrom: 800000,
    featured: true,
  },
  {
    id: "c",
    phase: "PLAN C",
    title: "MES ↔ ERP Integration",
    grad: "from-cyan-500 to-cyan-600",
    blurb: "เชื่อมยอดผลิตจริงเข้า ERP เป็นระบบเดียวทั้งโรงงาน",
    points: ["เชื่อม ERP (วางแผน/คลัง/จัดซื้อ)", "ตัดสต็อก/ต้นทุนอัตโนมัติ", "ข้อมูลไหลครบ end-to-end"],
    fit: "เหมาะกับ: อยากได้ระบบครบวงจรทั้งโรงงาน",
    priceFrom: 1500000,
  },
];

/** Deterministic grouping — no Intl, so server and client always agree. */
export function formatBaht(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
