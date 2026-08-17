import type { Person } from "@/lib/project-tasks";

/**
 * ห้องคุยงานในโปรเจกต์
 *
 * ต่างจากตารางอื่นตรงที่ **ลูกค้าเขียนได้ด้วย** ไม่ใช่เจ้าของเขียนอยู่ฝ่ายเดียว
 */

export const COMMENT_MAX = 4000;

/** ถี่แค่ไหนถึงจะดึงข้อความใหม่ — หยุดเองตอนสลับแท็บไปทำอย่างอื่น */
export const POLL_MS = 15_000;

export type ProjectComment = {
  id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  edited_at: string | null;
  profiles: Person | null;
};

export const COMMENT_SELECT =
  "id, author_id, body, created_at, edited_at, profiles(id, display_name, email, avatar_url)";

/** PostgREST คืน many-to-one เป็น object เดี่ยว แต่ตัวอนุมานชนิดมองเป็น array */
export function normalizeComments(rows: unknown): ProjectComment[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => {
    const row = r as Omit<ProjectComment, "profiles"> & { profiles: unknown };
    const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return { ...row, profiles: (p as Person) ?? null };
  });
}

/** เวลาแบบสั้น ไม่ใช้ Intl เพราะ Intl ให้เดือนเป็น พ.ศ. ซึ่งไม่ตรงกับที่ใช้ทั้งเว็บ */
const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export function clockOf(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** หัวคั่นวัน — วันนี้/เมื่อวาน อ่านง่ายกว่าเลขวันที่ */
export function dayLabelOf(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const midnight = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((midnight(today) - midnight(d)) / 86_400_000);

  if (diffDays === 0) return "วันนี้";
  if (diffDays === 1) return "เมื่อวาน";

  const sameYear = d.getFullYear() === today.getFullYear();
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${sameYear ? "" : ` ${d.getFullYear() + 543}`}`;
}

/** คีย์ไว้เทียบว่าข้ามวันหรือยัง — ใช้เวลาเครื่องผู้อ่าน ไม่ใช่ UTC */
export function dayKeyOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * ข้อความติดกันของคนเดิมภายใน 5 นาที ไม่ต้องโชว์ชื่อกับรูปซ้ำ
 * ห้องที่โชว์ชื่อทุกบรรทัดอ่านยากมากเวลาคนพิมพ์รัวหลายบรรทัด
 */
export function isContinuation(prev: ProjectComment | undefined, cur: ProjectComment): boolean {
  if (!prev) return false;
  if (prev.author_id !== cur.author_id) return false;
  if (dayKeyOf(prev.created_at) !== dayKeyOf(cur.created_at)) return false;

  const gap = new Date(cur.created_at).getTime() - new Date(prev.created_at).getTime();
  return gap >= 0 && gap < 5 * 60_000;
}

export function commentErrorMessage(error: { code?: string; message?: string } | null, fallback: string): string {
  if (error?.code === "42501") return "คุณไม่มีสิทธิ์ทำสิ่งนี้ในโปรเจกต์นี้";
  if (error?.code === "23514") return `ข้อความต้องไม่ว่าง และยาวไม่เกิน ${COMMENT_MAX.toLocaleString("th-TH")} ตัวอักษร`;
  return error?.message || fallback;
}
