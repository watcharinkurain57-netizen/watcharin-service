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

/**
 * หมวดหมู่งานตามเนื้องาน — คนละแกนกับ TaskColumn
 *
 * TaskColumn = สถานะ (รอทำ / กำลังทำ / เสร็จแล้ว) — งานต้องมีเสมอ
 * TaskGroup  = เนื้องาน (การทำงานร่วมกัน / ออกแบบ) — มีหรือไม่มีก็ได้
 *
 * งานหนึ่งมีได้ทั้งสองอย่างพร้อมกัน "Dashboard" อยู่หมวดออกแบบ และกำลังทำ
 */
export type TaskGroup = {
  id: string;
  project_id: string;
  name: string;
  color: ColumnColor;
  sort: number;
};

export type Task = {
  id: string;
  project_id: string;
  column_id: string;
  /** null = ยังไม่จัดหมวด — แสดงรวมกันใต้ "ไม่มีหมวด" */
  group_id: string | null;
  title: string;
  /** คำอธิบายยาว มี snippet โค้ดคั่นได้ · null = ยังไม่เขียน (ดู lib/task-notes.ts) */
  description: string | null;
  due_label: string | null;
  due_on: string | null;
  started_on: string | null;
  /** null = ยังไม่มอบหมายให้ใคร */
  assignee_id: string | null;
  sort: number;
};

/** คนในโปรเจกต์ที่มอบหมายงานให้ได้ */
export type Person = {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

/** ชื่อที่เอาไปแสดง — ถ้าไม่มีชื่อใช้ชื่อหน้า @ ถ้าไม่มีอีเมลอีกก็ยอมแพ้ */
export function personName(p: Person | undefined): string {
  if (!p) return "ไม่ระบุ";
  return p.display_name || p.email?.split("@")[0] || "ไม่ระบุ";
}

/** ตัวย่อสำหรับวงกลมรูปโปรไฟล์ตอนไม่มีรูป */
export function initials(p: Person | undefined): string {
  return personName(p).trim().charAt(0).toUpperCase() || "?";
}

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
  "id, project_id, column_id, group_id, title, description, due_label, due_on, started_on, assignee_id, sort";
export const COLUMN_SELECT = "id, project_id, name, color, is_done, sort";
export const GROUP_SELECT = "id, project_id, name, color, sort";
export const PROFILE_SELECT = "id, display_name, email, avatar_url";

/**
 * ไฟล์ที่แนบมากับงาน — คนละกองกับไฟล์ส่งมอบใน project_files
 *
 * ของแนบในงานคือของใช้ระหว่างทาง (ภาพหน้าจอตอนพัง ล็อก สเปกที่ลูกค้าส่งมา)
 * ส่วน project_files คือสารบัญของที่ส่งมอบให้ลูกค้าจริง ๆ
 * เหตุผลเต็ม ๆ อยู่หัวไฟล์ migration 0019
 *
 * ใช้ bucket เดียวกัน (FILES_BUCKET) จึงยืมตัวช่วยของ lib/project-files.ts ได้ทั้งชุด
 */
export type TaskFile = {
  id: string;
  /** null = งานที่แนบไว้ถูกลบไปแล้ว — ไฟล์เด้งมาโผล่ในแถบกู้คืน ไม่หายเงียบ */
  task_id: string | null;
  name: string;
  storage_path: string;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
};

export const TASK_FILE_SELECT = "id, task_id, name, storage_path, size_bytes, mime_type, created_at";

/** ชั้นคั่นใน path ของ Storage ไว้แยกจากไฟล์ส่งมอบตอนเปิดดูใน dashboard */
export const TASK_FILES_PREFIX = "tasks";

/** แนบทีละกี่ไฟล์ — น้อยกว่าแท็บไฟล์เยอะ เพราะที่นี่คือของประกอบงานเดียว */
export const MAX_TASK_FILES_PER_BATCH = 20;

/**
 * จัดงานลงหมวด พร้อมถังท้ายสำหรับงานที่ยังไม่ได้จัด
 *
 * คืนหมวดที่ไม่มีงานมาด้วย (`items` ว่าง) เพื่อให้ผู้ใช้เห็นว่าหมวดที่ตั้งไว้
 * ยังว่างอยู่ ไม่ใช่หายไปเฉย ๆ — ฝั่งที่เรียกเป็นคนตัดสินเองว่าจะซ่อนไหม
 */
export function groupTasks(
  tasks: Task[],
  groups: TaskGroup[]
): { group: TaskGroup | null; items: Task[] }[] {
  const known = new Set(groups.map((g) => g.id));

  const buckets = [...groups]
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "th"))
    .map((group) => ({ group: group as TaskGroup | null, items: tasks.filter((t) => t.group_id === group.id) }));

  /**
   * ถังท้าย = งานที่ไม่มีหมวด **และ** งานที่ชี้หมวดซึ่งหาไม่เจอ
   *
   * ⚠️ เงื่อนไขที่สองสำคัญกว่าที่คิด ถ้าเช็คแค่ `!t.group_id`
   * งานที่ชี้หมวดแปลกปลอมจะไม่เข้าถังไหนเลย = **หายไปจากทุกมุมมองแบบเงียบ ๆ**
   * เกิดได้จริงตอนโหลดรายการหมวดไม่สำเร็จแต่โหลดงานสำเร็จ
   * (เป็นอาการเดียวกับที่ 0005 เตือนไว้เรื่อง column_id — งานหลุดออกจากบอร์ด)
   */
  const loose = tasks.filter((t) => !t.group_id || !known.has(t.group_id));

  // ไว้ท้ายสุดเสมอ ไม่ใช่บนสุด — ถ้าอยู่บนสุดจะบังหมวดที่ตั้งใจจัดไว้
  // ซึ่งเป็นของที่ผู้ใช้อยากเห็นก่อน
  if (loose.length > 0) buckets.push({ group: null, items: loose });

  return buckets;
}

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
