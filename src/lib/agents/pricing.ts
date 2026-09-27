/**
 * ราคาต่อ token ของ Claude — ไว้ประมาณค่าใช้จ่ายของแต่ละรอบ
 *
 * ⚠️ เป็นตัวเลข ณ ตอนเขียน (มิ.ย. 2026) หน่วยดอลลาร์ต่อหนึ่งล้าน token
 * ราคาจริงเช็คที่ https://www.anthropic.com/pricing — ถ้าเปลี่ยนแก้ที่นี่ที่เดียว
 * ใช้สำหรับ "ดูว่าเงินไปไหน" ไม่ใช่ใบแจ้งหนี้ ยอดจริงอยู่ใน Anthropic Console
 *
 * รุ่นที่ไม่อยู่ในตาราง → คืน null (ไม่เดาราคา) หน้าจอจะโชว์แค่จำนวน token
 */

type Price = { input: number; output: number };

const PRICES: Record<string, Price> = {
  "claude-opus-5": { input: 5, output: 25 },
  // ปลายทางของ fallbacks: "default" เมื่อ Opus 5 ปฏิเสธคำขอหมวด cyber
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

/** เขียน cache (อายุ 5 นาที) แพงกว่า input ปกติ 25% · อ่าน cache ถูกลงเหลือ 10% */
const CACHE_WRITE = 1.25;
const CACHE_READ = 0.1;

export type TokenCounts = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
};

export function costUsd(model: string, t: TokenCounts): number | null {
  const p = PRICES[model];
  if (!p) return null;

  const dollars =
    (t.input * p.input +
      t.cacheWrite * p.input * CACHE_WRITE +
      t.cacheRead * p.input * CACHE_READ +
      t.output * p.output) /
    1_000_000;

  // ปัดที่ทศนิยม 6 ตำแหน่ง กันเศษทศนิยมลอยของ float สะสมตอนบวกหลายรอบ
  return Math.round(dollars * 1e6) / 1e6;
}
