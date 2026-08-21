/**
 * สรุปผลการทดลอง — เปลี่ยนสิ่งที่ผู้ใช้เพิ่งเล่นให้เป็นตัวเลขที่คุยขอบเขตงานต่อได้
 *
 * ⚠️ หัวใจของไฟล์นี้คือ **ตัวเลขทุกตัวมาจากข้อมูลของผู้ใช้เอง** ไม่ใช่ตัวอย่างที่เราแต่ง
 * เดโมส่วนใหญ่จบด้วยความประทับใจแล้วเงียบ เพราะไม่มีใครรู้ว่าของจริงจะใหญ่แค่ไหน
 * ถ้าจบด้วยตัวเลขของเขา บทสนทนาถัดไปจะเป็นเรื่องขอบเขตงาน ไม่ใช่เรื่องว่าจะคุยอะไรต่อ
 *
 * ⚠️ ตัวเลขทั้งหมดเป็น "ประมาณการ" ไม่ใช่ใบเสนอราคา และต้องเขียนกำกับให้ชัดทุกที่
 * ราคาผู้ให้บริการเปลี่ยนได้ตลอด ต้องตรวจหน้าราคาก่อนใช้อ้างอิงจริงเสมอ
 */

export type SessionStats = {
  tagCount: number;
  totalReadings: number;
  batches: number;
  firstAt: number | null;
  lastAt: number | null;
};

/** ขนาดต่อหนึ่งค่าที่จัดเก็บ — เวลา + รหัส tag + ค่า + ค่าโสหุ้ยของแถว */
const BYTES_PER_ROW_MIN = 50;
const BYTES_PER_ROW_MAX = 100;
/** index กินเนื้อที่เพิ่มจากตัวข้อมูล งาน timeseries ต้องมี index เวลาเสมอ */
const INDEX_OVERHEAD_MIN = 0.3;
const INDEX_OVERHEAD_MAX = 1.0;
/** เก็บเมื่อค่าเปลี่ยนเกินเกณฑ์ ลดปริมาณได้ 10–100 เท่าในงานโรงงานทั่วไป */
const DEADBAND_MIN = 10;
const DEADBAND_MAX = 100;

const GB = 1024 ** 3;
const DAYS_PER_MONTH = 30;

export type Projection = {
  /** วินาทีต่อครั้งที่ใช้คำนวณ — ค่าที่วัดได้จริง หรือค่าที่ผู้ใช้ปรับเอง */
  intervalSeconds: number;
  rowsPerDay: number;
  rowsPerMonth: number;
  gbPerMonthMin: number;
  gbPerMonthMax: number;
  /** ถ้าใช้ deadband แทนการเก็บทุกจังหวะ */
  gbPerMonthDeadbandMin: number;
  gbPerMonthDeadbandMax: number;
  /** เดือนกว่าจะเต็มโควตาที่แผนพื้นฐานให้มา — null คือไม่เต็มในเวลาที่มีความหมาย */
  monthsToFillIncludedMin: number | null;
  monthsToFillIncludedMax: number | null;
};

/** โควตาฐานข้อมูลที่แผนพื้นฐานของผู้ให้บริการที่ใช้อยู่ให้มา (GB) */
export const INCLUDED_DB_GB = 8;

/** อัตราที่วัดได้จริงจาก session — คืน null ถ้าข้อมูลน้อยเกินกว่าจะสรุปได้ */
export function observedIntervalSeconds(stats: SessionStats): number | null {
  if (!stats.firstAt || !stats.lastAt || stats.batches < 2) return null;
  const spanSeconds = (stats.lastAt - stats.firstAt) / 1000;
  if (spanSeconds <= 0) return null;
  // ช่วงห่างระหว่างชุด ไม่ใช่ระหว่างค่า — ตัวเชื่อมต่อส่งทีละชุดเสมอ
  return spanSeconds / (stats.batches - 1);
}

export function project(stats: SessionStats, intervalSeconds: number): Projection {
  const safeInterval = Math.max(0.1, intervalSeconds);
  const rowsPerDay = (stats.tagCount * 86_400) / safeInterval;
  const rowsPerMonth = rowsPerDay * DAYS_PER_MONTH;

  const bytesMin = rowsPerMonth * BYTES_PER_ROW_MIN * (1 + INDEX_OVERHEAD_MIN);
  const bytesMax = rowsPerMonth * BYTES_PER_ROW_MAX * (1 + INDEX_OVERHEAD_MAX);
  const gbMin = bytesMin / GB;
  const gbMax = bytesMax / GB;

  const monthsMin = gbMax > 0 ? INCLUDED_DB_GB / gbMax : null;
  const monthsMax = gbMin > 0 ? INCLUDED_DB_GB / gbMin : null;

  return {
    intervalSeconds: safeInterval,
    rowsPerDay,
    rowsPerMonth,
    gbPerMonthMin: gbMin,
    gbPerMonthMax: gbMax,
    gbPerMonthDeadbandMin: gbMin / DEADBAND_MAX,
    gbPerMonthDeadbandMax: gbMax / DEADBAND_MIN,
    monthsToFillIncludedMin: monthsMin,
    monthsToFillIncludedMax: monthsMax,
  };
}

const NF = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

export function num(value: number): string {
  return NF.format(Math.round(value));
}

/** เลือกจำนวนทศนิยมตามขนาด — 0.03 GB กับ 340 GB ต้องอ่านออกทั้งคู่ */
export function gb(value: number): string {
  if (value >= 100) return `${Math.round(value)} GB`;
  if (value >= 10) return `${value.toFixed(1)} GB`;
  if (value >= 1) return `${value.toFixed(2)} GB`;
  return `${(value * 1024).toFixed(0)} MB`;
}

export function duration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} วินาที`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  if (minutes < 60) return rest > 0 ? `${minutes} นาที ${rest} วินาที` : `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ชั่วโมง ${minutes % 60} นาที`;
}

export function months(value: number | null): string {
  if (value === null) return "—";
  if (value >= 24) return "เกิน 2 ปี";
  if (value >= 1) return `${value.toFixed(1)} เดือน`;
  const days = value * DAYS_PER_MONTH;
  if (days >= 1) return `${days.toFixed(1)} วัน`;
  return `${(days * 24).toFixed(1)} ชั่วโมง`;
}

/**
 * สร้างเอกสารสรุปเป็นข้อความ ให้คัดลอกหรือดาวน์โหลดไปคุยต่อได้
 * เขียนเป็น Markdown เพราะวางลงอีเมล เอกสาร หรือแชทแล้วยังอ่านรู้เรื่อง
 */
export function toMarkdown(
  stats: SessionStats,
  projection: Projection,
  tags: string[],
  observed: number | null
): string {
  const spanSeconds =
    stats.firstAt && stats.lastAt ? (stats.lastAt - stats.firstAt) / 1000 : 0;
  const stamp = new Date().toLocaleString("th-TH", { hour12: false });

  const lines = [
    "# สรุปผลการทดลอง — CoreSync",
    "",
    `จัดทำเมื่อ ${stamp}`,
    "",
    "## สิ่งที่วัดได้จากการทดลองครั้งนี้",
    "",
    "| หัวข้อ | ค่าที่วัดได้ |",
    "|---|---|",
    `| จำนวน tag ที่ส่งเข้ามา | ${num(stats.tagCount)} |`,
    `| จำนวนค่าที่รับทั้งหมด | ${num(stats.totalReadings)} |`,
    `| จำนวนชุดที่ส่ง | ${num(stats.batches)} |`,
    `| ระยะเวลาที่ทดลอง | ${duration(spanSeconds)} |`,
    `| ความถี่ที่วัดได้ | ${observed ? `ทุก ${observed.toFixed(1)} วินาที` : "ข้อมูลยังน้อยเกินกว่าจะสรุป"} |`,
    "",
    "รายชื่อ tag ที่รับเข้ามา",
    "",
    ...tags.map((tag) => `- ${tag}`),
    "",
    "## ถ้าเก็บข้อมูลจริง",
    "",
    `คำนวณจากการเก็บทุก ${projection.intervalSeconds.toFixed(1)} วินาที × ${num(stats.tagCount)} tag`,
    "",
    "| หัวข้อ | ประมาณการ |",
    "|---|---|",
    `| จำนวนแถวต่อวัน | ${num(projection.rowsPerDay)} |`,
    `| จำนวนแถวต่อเดือน | ${num(projection.rowsPerMonth)} |`,
    `| ขนาดข้อมูลต่อเดือน | ${gb(projection.gbPerMonthMin)} – ${gb(projection.gbPerMonthMax)} |`,
    `| ถ้าเก็บเมื่อค่าเปลี่ยน (deadband) | ${gb(projection.gbPerMonthDeadbandMin)} – ${gb(projection.gbPerMonthDeadbandMax)} ต่อเดือน |`,
    `| โควตา ${INCLUDED_DB_GB} GB ของแผนพื้นฐานจะเต็มใน | ${months(projection.monthsToFillIncludedMin)} – ${months(projection.monthsToFillIncludedMax)} |`,
    "",
    "## ข้อสังเกตที่ควรคุยกันต่อ",
    "",
    "- **เก็บย้อนหลังนานแค่ไหน** เป็นตัวกำหนดค่าใช้จ่ายมากกว่าจำนวน tag",
    "  แนวทางที่ใช้กันคือเก็บข้อมูลดิบ 30–90 วัน แล้วยุบเป็นรายนาทีหรือรายชั่วโมงสำหรับข้อมูลเก่า",
    "- **เก็บเมื่อค่าเปลี่ยนเกินเกณฑ์ (deadband)** เป็นวิธีมาตรฐานของงาน SCADA",
    "  และลดปริมาณข้อมูลได้มากที่สุดในบรรดามาตรการทั้งหมด",
    "- ตัวเลขข้างต้นเป็น**ประมาณการเพื่อใช้กำหนดขอบเขต ไม่ใช่ใบเสนอราคา**",
    "  ขนาดจริงขึ้นกับโครงสร้างข้อมูลที่ออกแบบ และราคาผู้ให้บริการต้องตรวจ ณ วันที่ใช้จริง",
    "",
    "## สิ่งที่โหมดทดลองยังไม่มี",
    "",
    "- ไม่มีการจัดเก็บข้อมูล — ข้อมูลผ่านแล้วผ่านเลย",
    "- ไม่มีบันทึกการตรวจสอบย้อนหลัง (audit log)",
    "- ไม่มีการแจ้งเตือนจริง ไม่มีการรับประกันความพร้อมใช้งาน",
    "- ไม่มีการกู้คืนเมื่อเครือข่ายหลุดยาว — ตัวเชื่อมต่อของจริงเก็บคิวลงดิสก์",
    "",
  ];

  return lines.join("\n");
}
