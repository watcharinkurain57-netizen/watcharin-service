import type { Reading } from "@/lib/demo/contract";

/**
 * แปลงชื่อ tag ที่ลูกค้าส่งเข้ามา ให้เป็นไซโลและเตาที่หน้าจอคนขับใช้ได้
 *
 * ⚠️ นี่คือการ **เดาจากชื่อ** โดยเจตนา และต้องเขียนกำกับบนหน้าจอเสมอ
 * ระบบจริงใช้ตารางแมป (`config/tags.kk.yaml`) ที่ตั้งค่าได้ ไม่ใช่เดาจากชื่อ
 * เพราะโรงงานจริงตั้งชื่อ tag ตามใจคนตั้ง ไม่มีทางเดาถูกทุกที่
 *
 * แต่สำหรับโหมดทดลอง การเดาคือสิ่งที่ทำให้ลูกค้าเห็นไซโล **ของเขาเอง**
 * ขึ้นจอภายในไม่กี่วินาทีโดยไม่ต้องตั้งค่าอะไรเลย ซึ่งคุ้มกว่าความแม่นยำ
 */

export type PlantSilo = {
  id: string;
  levelPct: number;
  thresholdPct: number;
  /** ค่าดิบจาก tag สถานะถ้ามี — ไม่ตีความ */
  statusRaw: string | null;
  low: boolean;
  stale: boolean;
};

export type PlantKiln = { id: string; value: number; unit: string | null; stale: boolean };

export type PlantView = {
  silos: PlantSilo[];
  kilns: PlantKiln[];
  /** tag ที่แมปไม่เข้าอะไรเลย — แสดงแยกไว้ ไม่ทิ้งเงียบ */
  others: string[];
};

const DEFAULT_THRESHOLD = 30;

const SILO_RE = /^(.+?)[_-](LEVEL|LVL)$/i;
const KILN_RE = /^(.+?)[_-](TEMP|TEMPERATURE)$/i;
const THRESHOLD_RE = /^(.+?)[_-](THRESHOLD|THRES|SETPOINT|SP)$/i;
const STATUS_RE = /^(.+?)[_-](STATUS|STATE|ST)$/i;

const numberOf = (reading: Reading | undefined): number | null =>
  typeof reading?.value === "number" && Number.isFinite(reading.value) ? reading.value : null;

const isStale = (reading: Reading | undefined) =>
  reading?.quality === "stale" || reading?.quality === "bad";

export function plantFromReadings(latest: Record<string, Reading>): PlantView {
  const thresholds = new Map<string, number>();
  const statuses = new Map<string, string>();

  for (const [tag, reading] of Object.entries(latest)) {
    const th = THRESHOLD_RE.exec(tag);
    const value = numberOf(reading);
    if (th && value !== null) thresholds.set(th[1].toUpperCase(), value);

    const st = STATUS_RE.exec(tag);
    if (st && typeof reading.value === "string") statuses.set(st[1].toUpperCase(), reading.value);
  }

  const silos: PlantSilo[] = [];
  const kilns: PlantKiln[] = [];
  const others: string[] = [];

  for (const [tag, reading] of Object.entries(latest)) {
    const silo = SILO_RE.exec(tag);
    if (silo) {
      const value = numberOf(reading);
      if (value !== null) {
        const key = silo[1].toUpperCase();
        const thresholdPct = thresholds.get(key) ?? DEFAULT_THRESHOLD;
        silos.push({
          id: silo[1],
          levelPct: value,
          thresholdPct,
          statusRaw: statuses.get(key) ?? null,
          low: value < thresholdPct,
          stale: isStale(reading),
        });
        continue;
      }
    }

    const kiln = KILN_RE.exec(tag);
    if (kiln) {
      const value = numberOf(reading);
      if (value !== null) {
        kilns.push({
          id: kiln[1],
          value,
          unit: reading.unit ?? null,
          stale: isStale(reading),
        });
        continue;
      }
    }

    if (THRESHOLD_RE.test(tag) || STATUS_RE.test(tag)) continue;
    others.push(tag);
  }

  // เรียงตามชื่อเพื่อให้ลำดับบนจอนิ่ง ไม่สลับไปมาตามลำดับที่ข้อมูลเข้ามา
  silos.sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
  kilns.sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
  others.sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

  return { silos, kilns, others };
}
