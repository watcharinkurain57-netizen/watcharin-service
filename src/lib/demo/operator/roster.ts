"use client";

/**
 * รายชื่อคนขับและรถสำหรับโหมดทดลอง + การผูกบัตรที่แตะจริง
 *
 * ⚠️ ชื่อและทะเบียนเป็นของสมมติทั้งหมด ไม่ใช่ของลูกค้ารายใด — เหตุผลเดียวกับ
 * เดโม Loader Ops คือสิ่งที่พิสูจน์ฝีมือคือ **กลไก** ส่วนชื่อจริงคือความเสี่ยง
 *
 * ⚠️ การผูกบัตรเก็บใน sessionStorage ไม่ใช่ฐานข้อมูล
 * โหมดทดลองประกาศว่าไม่เก็บข้อมูล และเลขบัตรที่ลูกค้าแตะคือข้อมูลส่วนบุคคล
 * ที่เราไม่ควรถือไว้เลยแม้แต่วินาทีเดียวบนเครื่องเรา — ปิดแท็บแล้วหายไปพร้อมกัน
 */

export type Driver = { id: string; name: string; code: string };

export const DRIVERS: readonly Driver[] = [
  { id: "OP-01", name: "สมชาย ทองดี", code: "EMP-1042" },
  { id: "OP-02", name: "ประเสริฐ ใจงาม", code: "EMP-1187" },
  { id: "OP-03", name: "วิรัตน์ แก้วมณี", code: "EMP-1233" },
  { id: "OP-04", name: "อนุชา พรมมา", code: "EMP-1310" },
];

export type Vehicle = { id: string; plate: string; color: string; spare?: boolean };

export const VEHICLES: readonly Vehicle[] = [
  { id: "LD-01", plate: "82-4471", color: "#2F5FE0" },
  { id: "LD-02", plate: "82-4472", color: "#16A34A" },
  { id: "LD-03", plate: "82-4473", color: "#9333EA" },
  { id: "LD-09", plate: "82-9910", color: "#F59E0B", spare: true },
];

const BINDING_KEY = "coresync.demo.cards";

type Bindings = Record<string, string>; // เลขบัตร → driver id

function read(): Bindings {
  try {
    const raw = window.sessionStorage.getItem(BINDING_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" ? (parsed as Bindings) : {};
  } catch {
    return {};
  }
}

/** หาว่าบัตรใบนี้เป็นของใคร — null คือยังไม่เคยผูก */
export function driverForCard(code: string): Driver | null {
  const id = read()[code];
  return DRIVERS.find((d) => d.id === id) ?? null;
}

/** ผูกบัตรที่เพิ่งแตะเข้ากับคนขับ — บัตรหนึ่งใบต่อคนขับหนึ่งคน */
export function bindCard(code: string, driverId: string) {
  try {
    const next = read();
    // ถอดบัตรเดิมของคนนี้ออกก่อน ไม่งั้นคนเดียวจะมีหลายใบและงงตอนสาธิต
    for (const [card, owner] of Object.entries(next)) {
      if (owner === driverId) delete next[card];
    }
    next[code] = driverId;
    window.sessionStorage.setItem(BINDING_KEY, JSON.stringify(next));
  } catch {
    // เขียนไม่ได้ = โหมดส่วนตัวของเบราว์เซอร์ ไม่ใช่เหตุให้ทั้งหน้าพัง
  }
}

/** ปิดบังเลขบัตรเวลาแสดงบนจอ — เลขบัตรพนักงานไม่ควรขึ้นจอเต็มใบตอนสาธิตต่อหน้าคนอื่น */
export function maskCard(code: string) {
  if (code.length <= 4) return "••••";
  return `${"•".repeat(Math.min(code.length - 4, 8))}${code.slice(-4)}`;
}
