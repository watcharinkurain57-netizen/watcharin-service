import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { LIMITS } from "./contract";

/**
 * โทเคนของโหมดทดลอง — เซ็นด้วย HMAC ไม่ต้องมีตารางเก็บ
 *
 * ทำไมไม่เก็บลงฐานข้อมูล: โหมดทดลองประกาศไว้ว่า "ไม่เก็บข้อมูลของคุณ"
 * ถ้าเปิดตารางขึ้นมาเก็บ session ก็ต้องอธิบายเพิ่มว่าเก็บอะไรบ้าง
 * และมีของให้รั่วโดยไม่จำเป็น — โทเคนที่ตรวจได้ด้วยลายเซ็นล้วน
 * ทำให้ไม่มีอะไรค้างอยู่ที่เราเลย หมดอายุแล้วก็หายไปเอง
 *
 * ผลที่ต้องยอมรับ: เพิกถอนโทเคนรายใบไม่ได้ ต้องรอหมดอายุ
 * ซึ่งรับได้เพราะอายุสั้นและไม่มีสิทธิ์อะไรนอกจากส่งข้อมูลเข้า channel ของตัวเอง
 */

function secret(): string | null {
  const raw = process.env.DEMO_TOKEN_SECRET?.trim();
  return raw && raw.length >= 16 ? raw : null;
}

/** ตั้งค่าครบหรือยัง — ให้ route ตอบ 503 ได้แทนที่จะพังกลางทาง */
export function isDemoConfigured() {
  return secret() !== null;
}

function b64url(buf: Buffer) {
  return buf.toString("base64url");
}

function sign(payload: string, key: string) {
  return b64url(createHmac("sha256", key).update(payload).digest());
}

export type DemoSession = { sessionId: string; expiresAt: number };

export function createToken(): { token: string; session: DemoSession } | null {
  const key = secret();
  if (!key) return null;

  const sessionId = randomBytes(9).toString("base64url"); // 12 ตัวอักษร เดาไม่ได้
  const expiresAt = Date.now() + LIMITS.sessionMinutes * 60_000;
  const payload = b64url(Buffer.from(JSON.stringify({ s: sessionId, e: expiresAt })));

  return { token: `${payload}.${sign(payload, key)}`, session: { sessionId, expiresAt } };
}

type Verified = { ok: true; session: DemoSession };
type Rejected = { ok: false; error: string };

export function verifyToken(token: unknown): Verified | Rejected {
  const key = secret();
  if (!key) return { ok: false, error: "โหมดทดลองยังไม่ได้ตั้งค่าบนเซิร์ฟเวอร์" };

  if (typeof token !== "string" || !token.includes(".")) {
    return { ok: false, error: "ไม่มีโทเคน หรือรูปแบบไม่ถูกต้อง" };
  }

  const cut = token.lastIndexOf(".");
  const payload = token.slice(0, cut);
  const given = token.slice(cut + 1);
  const want = sign(payload, key);

  // เทียบแบบใช้เวลาคงที่ กันการเดาลายเซ็นทีละตัวอักษรจากเวลาที่ตอบกลับ
  const a = Buffer.from(given);
  const b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: "โทเคนไม่ถูกต้อง — กดสร้างใหม่ที่หน้าเชื่อมต่อ" };
  }

  let parsed: { s?: unknown; e?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return { ok: false, error: "โทเคนเสียหาย — กดสร้างใหม่ที่หน้าเชื่อมต่อ" };
  }

  const sessionId = typeof parsed.s === "string" ? parsed.s : "";
  const expiresAt = typeof parsed.e === "number" ? parsed.e : 0;
  if (!sessionId || !expiresAt) {
    return { ok: false, error: "โทเคนเสียหาย — กดสร้างใหม่ที่หน้าเชื่อมต่อ" };
  }
  if (Date.now() > expiresAt) {
    return { ok: false, error: "โทเคนหมดอายุแล้ว — กดสร้างใหม่ที่หน้าเชื่อมต่อ" };
  }

  return { ok: true, session: { sessionId, expiresAt } };
}
