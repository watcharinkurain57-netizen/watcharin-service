"use client";

import { useSyncExternalStore } from "react";

export type DemoSession = {
  token: string;
  sessionId: string;
  expiresAt: string;
  /** ชื่อ tag ที่ผู้ใช้ตั้งไว้ — พกไปด้วยเพื่อให้แดชบอร์ดจำลองต่อด้วยชื่อเดิม */
  tags?: string[];
};

const KEY = "coresync.demo.session";
/** sessionStorage ไม่ยิง event ให้แท็บที่เขียนเอง จึงต้องมีสัญญาณของเราเอง */
const CHANGED = "coresync.demo.session.changed";

/**
 * เก็บ session ทดลองไว้ให้หน้าอื่นอ่านต่อได้
 *
 * ใช้ sessionStorage ไม่ใช่ localStorage เพราะโหมดทดลองควรจบเมื่อปิดแท็บ
 * ไม่ใช่ค้างอยู่ในเครื่องผู้ใช้ข้ามวัน — ตรงกับที่ประกาศว่าเป็นของชั่วคราว
 *
 * ทำไมต้องมีตัวกลางนี้: หน้าเชื่อมต่อเป็นคนสร้าง session แต่คนที่ต้องใช้
 * คือหน้าแดชบอร์ด ถ้าไม่มีที่ฝากไว้ ผู้ใช้ต้องคัดลอกรหัสไปวางเองซึ่งพังแน่
 */
export function saveSession(session: DemoSession) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(session));
    window.dispatchEvent(new Event(CHANGED));
  } catch {
    // โหมดส่วนตัวบางเบราว์เซอร์เขียนไม่ได้ — ไม่ใช่เหตุให้ทั้งหน้าพัง
  }
}

/** อัปเดตเฉพาะรายการ tag โดยไม่แตะโทเคน */
export function saveTags(tags: string[]) {
  const current = getSnapshot();
  if (!current) return;
  saveSession({ ...current, tags });
}

export function clearSession() {
  try {
    window.sessionStorage.removeItem(KEY);
    window.dispatchEvent(new Event(CHANGED));
  } catch {
    /* เงียบไว้ด้วยเหตุผลเดียวกับด้านบน */
  }
}

function parse(raw: string | null): DemoSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DemoSession>;
    if (!parsed?.sessionId || !parsed?.token || !parsed?.expiresAt) return null;
    // หมดอายุแล้วถือว่าไม่มี ไม่ต้องให้หน้าจอไปเจอ error ทีหลัง
    if (Date.parse(parsed.expiresAt) <= Date.now()) return null;
    return parsed as DemoSession;
  } catch {
    return null;
  }
}

// ⚠️ getSnapshot ต้องคืนวัตถุตัวเดิมถ้าข้อมูลไม่เปลี่ยน ไม่งั้น React จะเรนเดอร์วนไม่จบ
// จึงต้องจำค่าดิบไว้เทียบ แล้วแปลงใหม่เฉพาะตอนที่ข้อความใน storage เปลี่ยนจริง
let cachedRaw: string | null = null;
let cachedValue: DemoSession | null = null;

function getSnapshot(): DemoSession | null {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(KEY);
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parse(raw);
  }
  return cachedValue;
}

/** ฝั่งเซิร์ฟเวอร์ยังไม่รู้จัก session — React จะเรนเดอร์ซ้ำให้เองหลัง hydrate */
function getServerSnapshot(): DemoSession | null {
  return null;
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useStoredSession(): DemoSession | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
