/**
 * คำขอเริ่มโปรเจกต์ — ชนิดข้อมูลและค่าคงที่
 *
 * คำขอ ≠ โปรเจกต์ · คำขอคือ "อยากคุย" โปรเจกต์คือ "ตกลงทำแล้ว"
 * เหตุผลที่แยกกันคนละตารางอยู่หัวไฟล์ migration 0023
 */

export type RequestStatus = "new" | "talking" | "accepted" | "declined";

export type ProjectRequest = {
  id: string;
  title: string;
  detail: string;
  status: RequestStatus;
  created_at: string;
  created_by: string;
};

export const REQUEST_SELECT = "id, title, detail, status, created_at, created_by";

/** ต้องตรงกับ CHECK ใน 0023 — หน้าเว็บนับให้เห็นก่อนกดส่ง ตรงนั้นเป็นด่านสุดท้าย */
export const MAX_TITLE = 200;
export const MAX_DETAIL = 5000;

/**
 * คำที่ใช้กับสถานะ — เขียนคนละสำนวนสำหรับสองฝั่ง
 *
 * คนขออยากรู้ว่า "เรื่องของฉันถึงไหนแล้ว" ส่วนเจ้าของเว็บอยากรู้ว่า
 * "ใบนี้ฉันต้องทำอะไรต่อ" คำเดียวกันตอบสองคำถามนี้พร้อมกันไม่ได้
 */
export const STATUS_FOR_SENDER: Record<RequestStatus, { label: string; tone: string }> = {
  new: { label: "ส่งแล้ว รอดู", tone: "bg-amber-400/15 text-amber-700" },
  talking: { label: "กำลังคุยกันอยู่", tone: "bg-brand-100 text-brand-700" },
  accepted: { label: "รับงานแล้ว", tone: "bg-brand-500/15 text-brand-700" },
  declined: { label: "ครั้งนี้ยังไม่ได้รับ", tone: "bg-line-strong/40 text-ink-muted" },
};

export const STATUS_FOR_ADMIN: { id: RequestStatus; label: string }[] = [
  { id: "new", label: "ยังไม่ได้ดู" },
  { id: "talking", label: "กำลังคุย" },
  { id: "accepted", label: "รับแล้ว" },
  { id: "declined", label: "ไม่รับ" },
];

/** วันที่แบบไทยเป็น ค.ศ. ให้ตรงกับที่ใช้ทั้งเว็บ (Intl ภาษาไทยให้ พ.ศ. โดยปริยาย) */
export function requestDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH-u-ca-gregory", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
