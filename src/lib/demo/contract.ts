/**
 * สัญญาข้อมูลของโหมดทดลอง — ใช้ร่วมกันระหว่างตัวเชื่อมต่อ (connector) กับ API
 *
 * ทำไมต้องแยกไฟล์นี้ออกมา: ตัวเชื่อมต่อที่ลูกค้าเอาไปรันในเครื่องตัวเอง
 * ต้องส่งข้อมูลรูปแบบนี้เป๊ะ ๆ ถ้ากติกากระจายอยู่ในหลายที่ วันที่แก้เพดาน
 * จะลืมแก้ฝั่งใดฝั่งหนึ่งแล้วพังเงียบ — ที่นี่คือแหล่งความจริงที่เดียว
 */

/** เพดานต่อคำขอ — กันคนยิงถี่หรือยิงของใหญ่จนบิลบาน */
export const LIMITS = {
  /** ค่าที่อ่านได้ต่อหนึ่งคำขอ — ตัวเชื่อมต่อต้องสะสมแล้วส่งเป็นชุด */
  readingsPerBatch: 200,
  /** จำนวน tag ที่ต่างกันได้ในหนึ่ง session */
  distinctTags: 50,
  /** ความยาวชื่อ tag */
  tagLength: 64,
  /** ขนาด body ทั้งก้อน (ไบต์) */
  bodyBytes: 128 * 1024,
  /** อายุโทเคน */
  sessionMinutes: 120,
} as const;

/**
 * ⚠️ เวลาต้องประทับที่ต้นทาง ไม่ใช่ตอนคลาวด์รับ
 *
 * ถ้าเน็ตหน้างานหลุดไป 6 ชั่วโมงแล้วตัวเชื่อมต่อส่งย้อนหลังมาทีเดียว
 * การประทับเวลาตอนรับจะทำให้ข้อมูล 6 ชั่วโมงไปกองอยู่ที่วินาทีเดียวกันหมด
 * กราฟและรายงานใช้ไม่ได้ทันที และเป็นบั๊กที่หาสาเหตุยากมากเพราะระบบไม่ error
 */
export type Reading = {
  /** ชื่อ tag ของลูกค้าเอง — ให้เขาเห็นชื่อที่คุ้นบนจอ ไม่ใช่ชื่อที่เราตั้ง */
  tag: string;
  value: number | string | boolean;
  /** เวลาที่วัดได้จริง ประทับที่ต้นทาง (ISO 8601) */
  ts: string;
  unit?: string;
  /** คุณภาพของค่า ใช้ให้หน้าจอบอกได้ว่า "ข้อมูลอาจไม่ล่าสุด" */
  quality?: "good" | "stale" | "bad";
};

export type IngestBody = {
  token: string;
  /** เวลาที่ตัวเชื่อมต่อส่งชุดนี้ออกมา — ใช้ดูว่าหน่วงเท่าไหร่ ไม่ใช่เวลาของค่า */
  sentAt?: string;
  readings: Reading[];
};

/** สิ่งที่ฝั่งเบราว์เซอร์จะได้รับผ่าน Realtime */
export type ReadingsEvent = {
  readings: Reading[];
  /** เวลาที่เซิร์ฟเวอร์รับ — ใช้คู่กับ ts เพื่อดูความหน่วง */
  receivedAt: string;
};

/** ชื่อพารามิเตอร์ใน URL ที่พา sessionId ไปให้เครื่องอื่นเปิดดู — ใช้ร่วมกันทั้งฝั่งเซิร์ฟเวอร์และเบราว์เซอร์ */
export const WATCH_PARAM = "s";

export const CHANNEL_PREFIX = "demo:";
export const READINGS_EVENT = "readings";

export function channelFor(sessionId: string) {
  return `${CHANNEL_PREFIX}${sessionId}`;
}

type Invalid = { ok: false; error: string };
type Valid = { ok: true; readings: Reading[] };

const QUALITIES = new Set(["good", "stale", "bad"]);

/**
 * ตรวจ payload ให้ครบก่อนกระจายออกไป
 *
 * คืน error เป็นข้อความไทยที่บอกว่าต้องแก้อะไร ไม่ใช่รหัสข้อผิดพลาด
 * เพราะคนอ่านคือวิศวกรที่กำลังนั่งงงว่าทำไมต่อไม่ติด ไม่ใช่โปรแกรมเมอร์ของเรา
 */
export function validateReadings(input: unknown): Valid | Invalid {
  if (!Array.isArray(input)) {
    return { ok: false, error: "ต้องส่งฟิลด์ readings เป็น array" };
  }
  if (input.length === 0) {
    return { ok: false, error: "readings ว่างเปล่า — ไม่มีอะไรให้ส่ง" };
  }
  if (input.length > LIMITS.readingsPerBatch) {
    return {
      ok: false,
      error: `ส่งได้ครั้งละไม่เกิน ${LIMITS.readingsPerBatch} ค่า (ส่งมา ${input.length}) — ให้ตัวเชื่อมต่อแบ่งเป็นหลายชุด`,
    };
  }

  const tags = new Set<string>();
  const readings: Reading[] = [];

  for (let i = 0; i < input.length; i += 1) {
    const raw = input[i] as Record<string, unknown> | null;
    const at = `readings[${i}]`;

    if (!raw || typeof raw !== "object") {
      return { ok: false, error: `${at} ต้องเป็น object` };
    }

    const tag = typeof raw.tag === "string" ? raw.tag.trim() : "";
    if (!tag) return { ok: false, error: `${at}.tag ว่าง` };
    if (tag.length > LIMITS.tagLength) {
      return { ok: false, error: `${at}.tag ยาวเกิน ${LIMITS.tagLength} ตัวอักษร` };
    }
    tags.add(tag);
    if (tags.size > LIMITS.distinctTags) {
      return {
        ok: false,
        error: `หนึ่ง session รับได้ไม่เกิน ${LIMITS.distinctTags} tag ที่ต่างกัน`,
      };
    }

    const value = raw.value;
    if (typeof value !== "number" && typeof value !== "string" && typeof value !== "boolean") {
      return { ok: false, error: `${at}.value ต้องเป็นตัวเลข ข้อความ หรือ true/false` };
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      return { ok: false, error: `${at}.value เป็นตัวเลขที่ใช้ไม่ได้ (NaN หรือ Infinity)` };
    }
    if (typeof value === "string" && value.length > 200) {
      return { ok: false, error: `${at}.value ยาวเกิน 200 ตัวอักษร` };
    }

    const ts = typeof raw.ts === "string" ? raw.ts : "";
    if (!ts || Number.isNaN(Date.parse(ts))) {
      return {
        ok: false,
        error: `${at}.ts ต้องเป็นเวลาแบบ ISO 8601 เช่น 2026-08-20T09:30:00+07:00 — และต้องประทับที่ต้นทาง ไม่ใช่ให้คลาวด์ใส่ให้`,
      };
    }

    const quality = typeof raw.quality === "string" ? raw.quality : undefined;
    if (quality && !QUALITIES.has(quality)) {
      return { ok: false, error: `${at}.quality ต้องเป็น good, stale หรือ bad` };
    }

    readings.push({
      tag,
      value,
      ts,
      ...(typeof raw.unit === "string" && raw.unit ? { unit: raw.unit.slice(0, 24) } : {}),
      ...(quality ? { quality: quality as Reading["quality"] } : {}),
    });
  }

  return { ok: true, readings };
}
