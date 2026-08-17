/**
 * ไฟล์ส่งมอบ — ค่าคงที่และตัวช่วยที่ใช้ร่วมกันระหว่างหน้าเว็บกับ Storage
 */

/** ต้องตรงกับ bucket ที่สร้างใน migration 0009 */
export const FILES_BUCKET = "project-files";

/** ต้องตรงกับ file_size_limit ของ bucket ใน 0009 — ที่นี่เช็คไว้เพื่อบอกผู้ใช้ก่อนเสียเวลาอัป */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** signed URL อายุสั้น ๆ พอให้เบราว์เซอร์เริ่มโหลด ไม่ใช่ลิงก์ที่ส่งต่อกันได้ */
export const SIGNED_URL_SECONDS = 60;

export type ProjectFile = {
  id: string;
  name: string;
  status: "delivered" | "pending";
  delivered_on: string | null;
  storage_path: string | null;
  size_bytes: number | null;
  mime_type: string | null;
  sort: number;
};

export const FILE_SELECT = "id, name, status, delivered_on, storage_path, size_bytes, mime_type, sort";

/**
 * ตัดให้เหลือเฉพาะอักขระที่ใช้เป็น key ของ Storage ได้แน่ ๆ
 *
 * ⚠️ นี่คือจุดที่ชื่อไฟล์ภาษาไทยจะทำพัง ถ้าไม่ทำอะไรเลย
 * ตัวตรวจ key ของ storage-api ยอมรับชุดอักขระจำกัด และ `\w` ของมันเป็น ASCII
 * ชื่ออย่าง "คู่มือใช้งานหน้างาน.pdf" จึงโดนปฏิเสธตั้งแต่ยังไม่ทันอัป
 *
 * ทางออก: **key ใน Storage เป็น ascii ล้วน ส่วนชื่อไทยเก็บใน DB คอลัมน์ name**
 * คนใช้เห็นชื่อไทยตามเดิมทุกที่ ตัว ascii โผล่แค่ใน path ที่ไม่มีใครอ่าน
 */
function asciiSlug(s: string, max: number): string {
  return s
    // แยกสระ/วรรณยุกต์ที่ประกอบกับตัวอักษรออกก่อน เช่น é → e + ́
    // ตัวฐานที่เป็น ascii จะได้รอด ส่วนเครื่องหมายที่เหลือโดนตัดในบรรทัดถัดไป
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, max)
    // อย่าให้ลงท้ายหรือขึ้นต้นด้วยขีด/จุด — จุดนำหน้าทำให้กลายเป็นไฟล์ซ่อน
    .replace(/^[-._]+|[-._]+$/g, "");
}

/**
 * path ของไฟล์ใน Storage — {project_id}/{unique}-{ชื่อ ascii}
 *
 * โฟลเดอร์แรกต้องเป็น project_id เสมอ เพราะ policy ใน 0009 อ่านสิทธิ์จากตรงนั้น
 * ส่วน unique กันสองคนอัปไฟล์ชื่อเดียวกันทับกัน และกันคนเดาชื่อไฟล์ของคนอื่น
 *
 * @param unique ส่งเข้ามาแทนที่จะสุ่มข้างใน เพื่อให้ทดสอบผลลัพธ์ที่แน่นอนได้
 */
export function storageKey(projectId: string, fileName: string, unique: string): string {
  const dot = fileName.lastIndexOf(".");
  const hasExt = dot > 0 && dot < fileName.length - 1;

  const base = asciiSlug(hasExt ? fileName.slice(0, dot) : fileName, 48) || "file";
  const ext = asciiSlug(hasExt ? fileName.slice(dot + 1) : "", 12).toLowerCase();

  return `${projectId}/${unique}-${base}${ext ? `.${ext}` : ""}`;
}

/** ขนาดไฟล์แบบที่คนอ่านรู้เรื่อง — ไม่ใช้ Intl เพราะอยากได้ผลเดิมทุกเครื่อง */
export function formatBytes(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  // ต่ำกว่า 10 โชว์ทศนิยมหนึ่งตำแหน่ง เกินนั้นปัดเต็ม — 1.4 MB อ่านง่ายกว่า 1 MB
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

/**
 * แปลง error ของ Supabase เป็นภาษาที่บอกว่าต้องทำอะไรต่อ
 * ของดิบเป็นอังกฤษล้วนและบางตัวบอกแค่รหัส เช่น 42501 ซึ่งไม่ช่วยอะไรเลย
 */
export function fileErrorMessage(error: unknown, fallback: string): string {
  const e = error as { message?: string; statusCode?: string; error?: string } | null;
  const raw = `${e?.message ?? ""} ${e?.error ?? ""} ${e?.statusCode ?? ""}`.toLowerCase();

  if (raw.includes("42501") || raw.includes("row-level security") || raw.includes("unauthorized")) {
    return "ทำได้เฉพาะเจ้าของโปรเจกต์";
  }
  if (raw.includes("exceeded the maximum allowed size") || raw.includes("413")) {
    return `ไฟล์ใหญ่เกิน ${formatBytes(MAX_FILE_BYTES)}`;
  }
  if (raw.includes("already exists") || raw.includes("duplicate")) {
    return "มีไฟล์นี้อยู่แล้ว";
  }
  if (raw.includes("invalid key") || raw.includes("invalid_key")) {
    return "ชื่อไฟล์นี้ใช้ไม่ได้ ลองเปลี่ยนชื่อแล้วอัปใหม่";
  }
  return e?.message || fallback;
}
