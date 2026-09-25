import type { LayerId } from "@/lib/ai-map";

/**
 * สีประจำชั้นของแผนที่ — ใช้ทั้งบนแผนที่ แผงรายละเอียด และป้ายหัวข้อในส่วนอื่นของหน้า
 * เห็นสีเดียวกันที่ไหนก็รู้ว่าอยู่ชั้นเดียวกัน
 *
 * ⚠️ เขียนชื่อคลาสเต็มทุกตัว — Tailwind อ่านคลาสจากซอร์สตรง ๆ
 * ถ้าประกอบชื่อตอนรัน (`bg-${c}-100`) คลาสนั้นจะไม่ถูกสร้างเป็น CSS
 *
 * ตัวเลขชั้นใช้เฉด -700 ไม่ใช่ -600 เพราะตัวหนังสือขาวบน -600 ของเหลืองกับเขียว
 * ไม่ผ่านคอนทราสต์ 4.5:1 ที่ตัวอักษรขนาดนี้ต้องการ
 */
export type Tone = {
  /** กล่องตัวเลขชั้น */
  num: string;
  /** ป้ายนิ่ง (ไม่มี hover) */
  badge: string;
  /** ป้ายที่กดได้ */
  pill: string;
  /** ปุ่มบนแผนที่ตอนยังไม่ได้เลือก */
  chip: string;
  /** ปุ่มที่กำลังเลือก */
  on: string;
  /** ปุ่มที่เชื่อมกับหัวข้อที่เลือก */
  linked: string;
  text: string;
};

export const TONE: Record<LayerId, Tone> = {
  production: {
    num: "bg-sky-700 text-white",
    badge: "bg-sky-100 text-sky-800",
    pill: "bg-sky-100 text-sky-800 hover:bg-sky-200",
    chip: "border-line bg-surface hover:border-sky-300 hover:bg-sky-50",
    on: "border-sky-600 bg-sky-50 ring-4 ring-sky-500/15",
    linked: "border-sky-400 bg-sky-50/70",
    text: "text-sky-700",
  },
  system: {
    num: "bg-violet-700 text-white",
    badge: "bg-violet-100 text-violet-800",
    pill: "bg-violet-100 text-violet-800 hover:bg-violet-200",
    chip: "border-line bg-surface hover:border-violet-300 hover:bg-violet-50",
    on: "border-violet-600 bg-violet-50 ring-4 ring-violet-500/15",
    linked: "border-violet-400 bg-violet-50/70",
    text: "text-violet-700",
  },
  control: {
    num: "bg-amber-700 text-white",
    badge: "bg-amber-100 text-amber-900",
    pill: "bg-amber-100 text-amber-900 hover:bg-amber-200",
    chip: "border-line bg-surface hover:border-amber-300 hover:bg-amber-50",
    on: "border-amber-600 bg-amber-50 ring-4 ring-amber-500/15",
    linked: "border-amber-400 bg-amber-50/70",
    text: "text-amber-800",
  },
  harness: {
    num: "bg-brand-700 text-white",
    badge: "bg-brand-100 text-brand-800",
    pill: "bg-brand-100 text-brand-800 hover:bg-brand-200",
    chip: "border-line bg-surface hover:border-brand-300 hover:bg-brand-50",
    on: "border-brand-600 bg-brand-50 ring-4 ring-brand-500/15",
    linked: "border-brand-400 bg-brand-50/70",
    text: "text-brand-700",
  },
  model: {
    num: "bg-rose-700 text-white",
    badge: "bg-rose-100 text-rose-800",
    pill: "bg-rose-100 text-rose-800 hover:bg-rose-200",
    chip: "border-line bg-surface hover:border-rose-300 hover:bg-rose-50",
    on: "border-rose-600 bg-rose-50 ring-4 ring-rose-500/15",
    linked: "border-rose-400 bg-rose-50/70",
    text: "text-rose-700",
  },
};

/** ป้าย “ใหม่” ใช้สีเข้มกลาง ๆ ไม่ชนกับสีของชั้นไหน */
export const NEW_BADGE =
  "rounded-full bg-ink px-2 py-0.5 text-[0.68rem] font-bold text-surface-raised";
