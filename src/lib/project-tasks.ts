/** ชนิดข้อมูลและตัวช่วยของงานในโปรเจกต์ — ใช้ร่วมกันทุกมุมมอง */

export type TaskStatus = "todo" | "doing" | "done";

export type Task = {
  id: string;
  project_id: string;
  title: string;
  status: TaskStatus;
  due_label: string | null;
  due_on: string | null;
  started_on: string | null;
  sort: number;
};

export const TASK_COLUMNS: { id: TaskStatus; label: string; dot: string }[] = [
  { id: "todo", label: "รอทำ", dot: "bg-ink-faint" },
  { id: "doing", label: "กำลังทำ", dot: "bg-amber-400" },
  { id: "done", label: "เสร็จแล้ว", dot: "bg-brand-500" },
];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "รอทำ",
  doing: "กำลังทำ",
  done: "เสร็จแล้ว",
};

/** คอลัมน์ที่ดึงจากตาราง — รวมไว้ที่เดียวกันลืมเวลาเพิ่มฟิลด์ */
export const TASK_SELECT = "id, project_id, title, status, due_label, due_on, started_on, sort";

const THAI_MONTH = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

/**
 * แสดงวันที่แบบไทยเป็น ค.ศ. ไม่ใช่ พ.ศ.
 * (Intl ภาษาไทยให้ พ.ศ. โดยปริยาย ซึ่งไม่ตรงกับที่ใช้ทั้งเว็บ)
 */
export function thaiDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getDate()} ${THAI_MONTH[d.getMonth()]} ${d.getFullYear()}`;
}

/** วันนี้ในรูปแบบ YYYY-MM-DD ตามเวลาเครื่องผู้ใช้ ไม่ใช่ UTC */
export function todayIso(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** งานเลยกำหนดแล้วหรือยัง — งานที่เสร็จแล้วไม่นับว่าเลย */
export function isOverdue(t: Task): boolean {
  return t.status !== "done" && !!t.due_on && t.due_on < todayIso();
}

/**
 * ป้ายกำหนดส่งที่เอาไปแสดง
 * ถ้ามีวันที่จริงใช้วันที่ ถ้าไม่มีค่อยตกมาใช้ข้อความที่พิมพ์ไว้เอง
 */
export function dueText(t: Task): string {
  if (t.due_on) return thaiDate(t.due_on);
  return t.due_label ?? "";
}
