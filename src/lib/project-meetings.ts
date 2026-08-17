import type { Person } from "@/lib/project-tasks";

/**
 * ตารางประชุมของโปรเจกต์
 *
 * เก็บแค่ลิงก์ห้อง ไม่ได้ต่อ Google Calendar API (ดูเหตุผลใน migration 0015)
 * ไฟล์นี้จึงมีตัวช่วยสองตัวที่ทำให้การ "ไปเอาลิงก์มา" สั้นที่สุดเท่าที่ทำได้
 * โดยไม่ต้องขอสิทธิ์อะไรจาก Google เลย
 */

/** เปิดห้อง Meet ใหม่ทันที — Google สร้างห้องให้ตอนเปิดหน้านี้ */
export const MEET_NEW_URL = "https://meet.google.com/new";

export type ProjectMeeting = {
  id: string;
  title: string;
  starts_at: string;
  minutes: number;
  meet_url: string | null;
  note: string | null;
  created_by: string | null;
  profiles: Person | null;
};

export const MEETING_SELECT =
  "id, title, starts_at, minutes, meet_url, note, created_by, profiles(id, display_name, email, avatar_url)";

/** PostgREST คืน many-to-one เป็น object เดี่ยว แต่ตัวอนุมานชนิดมองเป็น array */
export function normalizeMeetings(rows: unknown): ProjectMeeting[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => {
    const row = r as Omit<ProjectMeeting, "profiles"> & { profiles: unknown };
    const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return { ...row, profiles: (p as Person) ?? null };
  });
}

export function endOf(m: { starts_at: string; minutes: number }): Date {
  return new Date(new Date(m.starts_at).getTime() + m.minutes * 60_000);
}

/**
 * คีย์วัน YYYY-MM-DD ตาม **เวลาเครื่องผู้อ่าน**
 *
 * ⚠️ ห้ามใช้ `iso.slice(0, 10)` แทน เพราะค่าใน DB เป็น UTC
 * ประชุมไทยตอนตีหนึ่งของวันที่ 20 คือ 18:00 ของวันที่ 19 ใน UTC
 * ตัดสตริงตรง ๆ จะไปโผล่ผิดช่องบนปฏิทินแบบเงียบ ๆ
 */
export function dayKeyOf(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** จัดประชุมลงช่องวัน สำหรับวาดปฏิทิน */
export function byDay(list: { starts_at: string }[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  list.forEach((m, i) => {
    const k = dayKeyOf(m.starts_at);
    map.set(k, [...(map.get(k) ?? []), i]);
  });
  return map;
}

/** ช่องของเดือน: เติม null หน้า-หลังให้ครบสัปดาห์ แบบเดียวกับปฏิทินงาน */
export function monthCells(month: Date): (number | null)[] {
  const y = month.getFullYear();
  const m = month.getMonth();
  const lead = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** เวลาเริ่มต้นตอนกดวันบนปฏิทิน — 10:00 ของวันนั้น */
export function dayToLocalInput(year: number, monthIndex: number, day: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}T10:00`;
}

/** กำลังประชุมอยู่ตอนนี้ — ใช้ตัดสินว่าจะเน้นปุ่มเข้าห้องไหม */
export function isLive(m: { starts_at: string; minutes: number }, now = new Date()): boolean {
  return new Date(m.starts_at) <= now && now < endOf(m);
}

export function isPast(m: { starts_at: string; minutes: number }, now = new Date()): boolean {
  return endOf(m) <= now;
}

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

/**
 * เวลาแบบที่คนอ่านแล้วรู้เลยว่าต้องเตรียมตัวเมื่อไหร่
 * ไม่ใช้ Intl เพราะภาษาไทยของมันให้ปี พ.ศ. ซึ่งไม่ตรงกับที่ใช้ทั้งเว็บ
 */
export function meetingWhen(m: { starts_at: string; minutes: number }, now = new Date()): string {
  const d = new Date(m.starts_at);
  const clock = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const e = endOf(m);
  const endClock = `${String(e.getHours()).padStart(2, "0")}:${String(e.getMinutes()).padStart(2, "0")}`;
  const span = `${clock}–${endClock}`;

  const midnight = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((midnight(d) - midnight(now)) / 86_400_000);

  if (days === 0) return `วันนี้ ${span}`;
  if (days === 1) return `พรุ่งนี้ ${span}`;
  if (days === -1) return `เมื่อวาน ${span}`;

  const sameYear = d.getFullYear() === now.getFullYear();
  const date = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${sameYear ? "" : ` ${d.getFullYear() + 543}`}`;
  return `${date} ${span}`;
}

/** เหลืออีกนานไหม — บอกเป็นคำ ไม่ใช่ตัวเลขดิบ */
export function countdownOf(m: { starts_at: string; minutes: number }, now = new Date()): string | null {
  if (isPast(m, now)) return null;
  if (isLive(m, now)) return "กำลังประชุมอยู่";

  const mins = Math.round((new Date(m.starts_at).getTime() - now.getTime()) / 60_000);
  if (mins <= 60) return `อีก ${mins} นาที`;

  const hours = Math.round(mins / 60);
  if (hours < 24) return `อีก ${hours} ชั่วโมง`;

  return `อีก ${Math.round(hours / 24)} วัน`;
}

/**
 * ลิงก์เปิดหน้าสร้างนัดใน Google Calendar โดยกรอกชื่อกับเวลาให้แล้ว
 *
 * นี่คือทางลัดที่ใกล้เคียง "สร้างลิงก์ Meet ให้อัตโนมัติ" ที่สุด
 * โดยไม่ต้องขอ scope อะไรจาก Google เลย — ผู้ใช้แค่กด
 * "เพิ่มการประชุมทางวิดีโอ" แล้วบันทึก ก็ได้ลิงก์ Meet มาวางกลับ
 *
 * รูปแบบวันที่ของ Calendar ต้องเป็น UTC แบบไม่มีขีดคั่น: YYYYMMDDTHHMMSSZ
 */
export function googleCalendarUrl(m: { title: string; starts_at: string; minutes: number; note?: string | null }): string {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const start = new Date(m.starts_at);
  const end = new Date(start.getTime() + m.minutes * 60_000);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: m.title,
    dates: `${stamp(start)}/${stamp(end)}`,
  });
  if (m.note) params.set("details", m.note);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * แปลงค่าจากช่อง datetime-local เป็น ISO
 *
 * ⚠️ ช่อง datetime-local ให้ค่ามาแบบไม่มีโซนเวลา ('2026-08-20T14:00')
 * ถ้าเอาไปต่อ 'Z' เองจะกลายเป็นเวลา UTC ทำให้เวลาเพี้ยนไป 7 ชั่วโมง
 * ต้องให้ new Date() ตีความเป็นเวลาเครื่องผู้ใช้แล้วค่อยแปลงเป็น ISO
 */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ทางกลับ — เอา ISO มาใส่ช่อง datetime-local ซึ่งต้องเป็นเวลาเครื่อง ไม่ใช่ UTC */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function meetingErrorMessage(error: { code?: string; message?: string } | null, fallback: string): string {
  if (error?.code === "42501") return "นัดประชุมได้เฉพาะคนในโปรเจกต์นี้";
  if (error?.code === "23514") return "ลิงก์ห้องประชุมต้องขึ้นต้นด้วย https:// และชื่อนัดต้องไม่ว่าง";
  return error?.message || fallback;
}
