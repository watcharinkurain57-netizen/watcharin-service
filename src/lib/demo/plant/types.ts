/**
 * เดโมระบบจัดการงานรถตัก — ชนิดข้อมูล
 *
 * ⚠️ นี่คือ "โรงงานตัวอย่าง" ไม่ใช่ของลูกค้ารายใด
 * ชื่อไซโล เตา และรถ ตั้งขึ้นใหม่ทั้งหมดโดยเจตนา สิ่งที่ยกมาจากระบบจริง
 * คือ **กลไก** ไม่ใช่ชื่อ — การแย่งจองงาน การกันบันทึกซ้ำ การระงับแจ้งเตือน
 * เพราะกลไกคือสิ่งที่พิสูจน์ฝีมือ ส่วนชื่อคือสิ่งที่สร้างความเสี่ยง
 *
 * กติกาที่ยกมาจากสัญญาข้อมูลของระบบจริง และห้ามแก้โดยไม่ทบทวน
 *   - รหัสไซโลเป็นข้อความ ("SL1") ไม่ใช่ตัวเลข — กันความผิดพลาดที่พบบ่อย
 *   - สถานะจาก SCADA เก็บดิบ ไม่ตีความ ("ปกติ" / "เต็ม")
 *   - เวลาที่ตัดสินสิทธิ์คือเวลาที่ถึงเซิร์ฟเวอร์ ไม่ใช่เวลาที่กดบนเครื่อง
 *   - ส่งซ้ำด้วยรหัสข้อความเดิม ต้องได้งานเดิม ไม่ใช่งานใหม่
 */

export type Quality = "good" | "stale";
export type Channel = "GS" | "SS";

export type Silo = {
  /** รหัสเป็นข้อความเสมอ ไม่ใช่ตัวเลข */
  id: string;
  levelPct: number;
  /** ค่าที่ SCADA ส่งมาดิบ ๆ ระบบไม่ตีความว่าแปลว่าอะไร */
  statusRaw: string;
  channel: Channel;
  thresholdPct: number;
  quality: Quality;
  /** อัตราที่เตากินวัตถุดิบต่อวินาที */
  drainPerSec: number;
  /** เตาที่ไซโลนี้ป้อน — ใช้ตัดสินว่าจะระงับการแจ้งเตือนไหม */
  feedsKiln: string;
};

export type Kiln = {
  id: string;
  running: boolean;
  material: string;
  /** เวลาที่กลับมาเดิน ใช้นับผ่อนผันก่อนเปิดแจ้งเตือนอีกครั้ง */
  resumedAt: number | null;
};

export type Vehicle = {
  id: string;
  operator: string;
  /** งานที่ถืออยู่ — หนึ่งคันถือได้ทีละงานเดียว */
  activeJobId: string | null;
};

export type Job = {
  id: string;
  siloId: string;
  vehicleId: string;
  startedAt: number;
  endedAt: number | null;
  /** รหัสข้อความที่เครื่องปลายทางสร้าง ใช้กันบันทึกซ้ำ */
  msgId: string;
};

/** คำขอวัตถุดิบที่กระจายไปทุกเครื่อง แล้วใครกดก่อนได้ก่อน */
export type MaterialRequest = {
  id: string;
  siloId: string;
  createdAt: number;
  /** เครื่องที่แสดงคำขอนี้แล้ว — แยกจาก "กดแล้ว" คนละเรื่องกัน */
  displayedBy: string[];
  actedBy: string | null;
  expiresAt: number;
};

export type LogKind = "scada" | "request" | "claim" | "reject" | "alert" | "system";

export type LogEntry = {
  id: number;
  at: number;
  kind: LogKind;
  text: string;
  /** ข้อความที่ระบบตอบกลับจริง เช่น 201 granted / 409 taken */
  detail?: string;
};

export type PlantState = {
  now: number;
  running: boolean;
  silos: Silo[];
  kilns: Kiln[];
  vehicles: Vehicle[];
  jobs: Job[];
  requests: MaterialRequest[];
  /** ไซโลที่กำลังกระพริบอยู่บนหน้าจอทุกเครื่อง */
  blinking: string[];
  /** ไซโลที่ถูกระงับการแจ้งเตือนเพราะเตาที่มันป้อนหยุดเดิน */
  suppressed: string[];
  log: LogEntry[];
  /** รหัสข้อความที่เคยรับแล้ว — รับซ้ำต้องไม่เกิดงานใหม่ */
  seenMsgIds: Record<string, string>;
  counters: { scadaMessages: number; rejected: number; duplicates: number };
};

export type PlantAction =
  | { type: "tick"; at: number }
  | { type: "toggleRun" }
  | { type: "requestMaterial"; siloId: string; at: number }
  | { type: "claim"; vehicleId: string; siloId: string; msgId: string; at: number }
  | { type: "raceAll"; siloId: string; at: number }
  | { type: "duplicateClaim"; at: number }
  | { type: "staleClaim"; at: number }
  | { type: "stopJob"; vehicleId: string; at: number }
  | { type: "setKiln"; kilnId: string; running: boolean; at: number }
  | { type: "reset"; at: number };
