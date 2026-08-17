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

/** ไฟล์ที่ผู้ใช้เลือกมา พร้อมชื่อที่จะเอาไปแสดง (มีเส้นทางในโฟลเดอร์ติดมาถ้ามี) */
export type PickedFile = { file: File; name: string };

/** กันคนลากทั้ง Downloads มาวางแล้วยิงขึ้น Storage เป็นพันไฟล์ */
export const MAX_FILES_PER_BATCH = 100;

/**
 * ชื่อที่จะแสดงของไฟล์ที่เลือกผ่าน "เลือกโฟลเดอร์"
 *
 * `webkitRelativePath` ให้เส้นทางในโฟลเดอร์มาด้วย เช่น `ส่งมอบงวด3/คู่มือ.pdf`
 * เก็บทั้งเส้นทางไว้ในชื่อเพื่อให้แยกออกว่าไฟล์ชื่อซ้ำมาจากโฟลเดอร์ไหน
 *
 * ⚠️ เส้นทางนี้ลงไปใน **ชื่อที่แสดง** เท่านั้น ไม่ลงไปใน path ของ Storage
 * เพราะ policy ใน 0009 ต้องการให้โฟลเดอร์แรกเป็น project_id และมี slash เดียว
 * `storageKey()` แปลง `/` เป็น `-` ให้อยู่แล้ว
 */
export function pickedName(file: File): string {
  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  return rel && rel.length > 0 ? rel : file.name;
}

/**
 * ชื่อสำหรับตอนบันทึกลงเครื่อง — ตัดเส้นทางโฟลเดอร์ออก
 * ใส่ slash ลงใน Content-Disposition ไม่ได้ เบราว์เซอร์จะตัดทิ้งหรือเพี้ยน
 */
export function downloadName(name: string): string {
  return name.split("/").pop() || name;
}

/** ---------- ลากโฟลเดอร์มาวาง ---------- */

/**
 * `dataTransfer.files` ไม่มีของข้างในโฟลเดอร์
 * ลากโฟลเดอร์มาวางจะได้รายการเดียวขนาด 0 ไบต์ ซึ่งอัปไม่ได้และอ่านไม่รู้เรื่อง
 * ต้องไล่ผ่าน entry API ของเบราว์เซอร์เอาไฟล์ข้างในออกมาเอง
 */
type FsEntry = {
  isFile: boolean;
  isDirectory: boolean;
  fullPath: string;
  file(onOk: (f: File) => void, onErr: (e: unknown) => void): void;
  createReader(): { readEntries(onOk: (e: FsEntry[]) => void, onErr: (e: unknown) => void): void };
};

/**
 * ต้องเรียก **ทันทีใน event handler ก่อน await ตัวแรก**
 * `DataTransfer` ใช้ไม่ได้แล้วหลังจาก handler คืนค่า
 */
export function dropEntries(dt: DataTransfer): FsEntry[] {
  const out: FsEntry[] = [];
  for (const item of Array.from(dt.items ?? [])) {
    const get = (item as DataTransferItem & { webkitGetAsEntry?: () => FsEntry | null }).webkitGetAsEntry;
    const entry = typeof get === "function" ? get.call(item) : null;
    if (entry) out.push(entry);
  }
  return out;
}

/** readEntries คืนมาทีละไม่เกิน ~100 รายการ ต้องวนเรียกจนกว่าจะได้ array ว่าง */
function readAll(reader: ReturnType<FsEntry["createReader"]>): Promise<FsEntry[]> {
  return new Promise((resolve) => {
    const all: FsEntry[] = [];
    const step = () =>
      reader.readEntries((batch) => {
        if (batch.length === 0) return resolve(all);
        all.push(...batch);
        step();
      }, () => resolve(all));
    step();
  });
}

export async function expandEntries(entries: FsEntry[], limit = MAX_FILES_PER_BATCH): Promise<PickedFile[]> {
  const out: PickedFile[] = [];

  async function walk(entry: FsEntry) {
    if (out.length >= limit) return;

    if (entry.isFile) {
      const file = await new Promise<File | null>((resolve) =>
        entry.file((f) => resolve(f), () => resolve(null))
      );
      // fullPath ขึ้นต้นด้วย / เสมอ ตัดทิ้งให้เหมือนรูปแบบของ webkitRelativePath
      if (file) out.push({ file, name: entry.fullPath.replace(/^\//, "") || file.name });
      return;
    }

    if (entry.isDirectory) {
      for (const child of await readAll(entry.createReader())) await walk(child);
    }
  }

  for (const e of entries) await walk(e);
  return out.slice(0, limit);
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
