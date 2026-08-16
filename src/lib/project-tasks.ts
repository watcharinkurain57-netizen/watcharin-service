/** ชนิดข้อมูลและตัวช่วยของงานในโปรเจกต์ — ใช้ร่วมกันทุกมุมมอง */

/** ชื่อสีแบบ token ไม่ใช่ค่าสีจริง เพื่อให้เปลี่ยนธีมทีเดียวได้ทั้งเว็บ */
export type ColumnColor = "slate" | "amber" | "jade" | "sky" | "violet" | "coral";

export type TaskColumn = {
  id: string;
  project_id: string;
  name: string;
  color: ColumnColor;
  /** งานในคอลัมน์นี้ถือว่าจบแล้ว — ขีดฆ่า และไม่นับว่าเลยกำหนด */
  is_done: boolean;
  sort: number;
};

export type Task = {
  id: string;
  project_id: string;
  column_id: string;
  title: string;
  due_label: string | null;
  due_on: string | null;
  started_on: string | null;
  sort: number;
};

export const COLUMN_COLORS: { id: ColumnColor; label: string; dot: string; chip: string }[] = [
  { id: "slate", label: "เทา", dot: "bg-ink-faint", chip: "bg-white/10 text-ink" },
  { id: "amber", label: "เหลือง", dot: "bg-amber-400", chip: "bg-amber-400/15 text-amber-200" },
  { id: "jade", label: "เขียว", dot: "bg-brand-500", chip: "bg-brand-500/15 text-brand-300" },
  { id: "sky", label: "ฟ้า", dot: "bg-sky-400", chip: "bg-sky-400/15 text-sky-200" },
  { id: "violet", label: "ม่วง", dot: "bg-violet-400", chip: "bg-violet-400/15 text-violet-200" },
  { id: "coral", label: "ส้ม", dot: "bg-orange-400", chip: "bg-orange-400/15 text-orange-200" },
];

export function colorOf(c: ColumnColor) {
  return COLUMN_COLORS.find((x) => x.id === c) ?? COLUMN_COLORS[0];
}

/** คอลัมน์ที่ดึงจากตาราง — รวมไว้ที่เดียวกันลืมเวลาเพิ่มฟิลด์ */
export const TASK_SELECT =
  "id, project_id, column_id, title, due_label, due_on, started_on, sort";
export const COLUMN_SELECT = "id, project_id, name, color, is_done, sort";

const THAI_MONTH = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

/**
 * แปลง Date เป็น YYYY-MM-DD ตามเวลาเครื่องผู้ใช้
 *
 * ⚠️ ห้ามใช้ toISOString() แทน เพราะมันแปลงเป็น UTC ก่อน
 * ไทยอยู่ UTC+7 เที่ยงคืนของเราคือ 17:00 ของเมื่อวานในเวลา UTC
 * ผลคือวันที่เพี้ยนไปหนึ่งวันแบบเงียบ ๆ
 */
export function isoOf(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function todayIso(): string {
  return isoOf(new Date());
}

/**
 * แสดงวันที่แบบไทยเป็น ค.ศ. ไม่ใช่ พ.ศ.
 * (Intl ภาษาไทยให้ พ.ศ. โดยปริยาย ซึ่งไม่ตรงกับที่ใช้ทั้งเว็บ)
 */
export function thaiDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()} ${THAI_MONTH[d.getMonth()]} ${d.getFullYear()}`;
}

/** งานอยู่ในคอลัมน์ที่ถือว่าจบแล้วหรือยัง */
export function isDone(t: Task, columns: TaskColumn[]): boolean {
  return columns.find((c) => c.id === t.column_id)?.is_done ?? false;
}

/** งานเลยกำหนดแล้วหรือยัง — งานที่จบแล้วไม่นับว่าเลย */
export function isOverdue(t: Task, columns: TaskColumn[]): boolean {
  return !isDone(t, columns) && !!t.due_on && t.due_on < todayIso();
}

/**
 * ป้ายกำหนดส่งที่เอาไปแสดง
 * ถ้ามีวันที่จริงใช้วันที่ ถ้าไม่มีค่อยตกมาใช้ข้อความที่พิมพ์ไว้เอง
 */
export function dueText(t: Task): string {
  if (t.due_on) return thaiDate(t.due_on);
  return t.due_label ?? "";
}
