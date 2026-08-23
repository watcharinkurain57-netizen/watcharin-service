"use client";

import { useSyncExternalStore } from "react";
import { WATCH_PARAM } from "./contract";

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

// ─────────────────────────────────────────────────────────────────────────────
// ลิงก์ดูอย่างเดียว — ให้แท็บเล็ตหรือจอในห้องควบคุมเปิดดู session ของคนอื่นได้
//
// ⚠️ ทำไมต้องมี: ของเดิมเก็บ session ไว้ใน sessionStorage ของเบราว์เซอร์ที่กดสร้าง
// เท่านั้น เครื่องอื่นเปิดหน้าเดียวกันจึงไม่เห็นอะไรเลย ซึ่งพังกับฉากที่ต้องใช้จริง
// คือคนหนึ่งรันตัวเชื่อมต่อที่เครื่อง SCADA แล้วคนที่เหลือดูจากจอของตัวเอง
//
// ตัวรับข้อมูล (useDemoChannel) ต้องการแค่ sessionId ไม่ต้องใช้โทเคนเลย
// เพราะโทเคนมีไว้ "ส่งเข้า" ไม่ใช่ "ดู" ⇒ ลิงก์ดูอย่างเดียวจึงปลอดภัยโดยโครงสร้าง
// คนที่ได้ลิงก์ไปดูได้อย่างเดียว ส่งข้อมูลปนเข้ามาไม่ได้
// ─────────────────────────────────────────────────────────────────────────────

export type ViewerSession = {
  sessionId: string;
  /** null = เปิดมาจากลิงก์ดูอย่างเดียว — ส่งข้อมูลเข้าไม่ได้ */
  token: string | null;
  tags?: string[];
};

/** ประกอบลิงก์สำหรับส่งให้เครื่องอื่นเปิด */
export function watchUrl(origin: string, sessionId: string) {
  return `${origin}/coresync?${WATCH_PARAM}=${encodeURIComponent(sessionId)}`;
}

function readWatchParam(): string | null {
  try {
    const raw = new URLSearchParams(window.location.search).get(WATCH_PARAM);
    const id = raw?.trim();
    if (!id) return null;
    // sessionId ที่เราออกเป็น base64url — กันคนยัดอักขระแปลกไปเป็นชื่อ channel
    return /^[A-Za-z0-9_-]{1,32}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

// เหตุผลเดียวกับ getSnapshot ด้านบน — ต้องคืนวัตถุตัวเดิมถ้าข้อมูลไม่เปลี่ยน
let cachedViewerKey: string | null = null;
let cachedViewer: ViewerSession | null = null;

function getViewerSnapshot(): ViewerSession | null {
  const watching = readWatchParam();
  // เรียก getSnapshot ก่อนเสมอ เพื่อให้ cachedRaw ตรงกับ storage ปัจจุบัน
  const owned = getSnapshot();
  // ลิงก์ที่เปิดมาต้องชนะของที่ค้างในเครื่อง ไม่งั้นคนที่เคยสร้าง session ของตัวเอง
  // จะกดลิงก์เพื่อนแล้วเห็นข้อมูลตัวเองโดยไม่รู้ตัว
  const key = watching ? `w:${watching}` : `o:${cachedRaw ?? ""}`;

  if (key !== cachedViewerKey) {
    cachedViewerKey = key;
    cachedViewer = watching
      ? { sessionId: watching, token: null }
      : owned
        ? { sessionId: owned.sessionId, token: owned.token, tags: owned.tags }
        : null;
  }
  return cachedViewer;
}

function subscribeViewer(onChange: () => void) {
  const off = subscribe(onChange);
  // เปลี่ยน URL ด้วยปุ่มย้อนกลับก็ต้องเปลี่ยน session ที่กำลังดู
  window.addEventListener("popstate", onChange);
  return () => {
    off();
    window.removeEventListener("popstate", onChange);
  };
}

/**
 * session ที่หน้าจอควรแสดง — ของตัวเอง หรือของคนที่ส่งลิงก์มาให้
 *
 * ใช้ตัวนี้ในหน้าที่ "ดูข้อมูล" ส่วนหน้าที่ต้อง "ส่งข้อมูล" ให้ใช้ useStoredSession
 * เพราะต้องมีโทเคนจริงเท่านั้นถึงจะส่งได้
 */
export function useViewerSession(): ViewerSession | null {
  return useSyncExternalStore(subscribeViewer, getViewerSnapshot, getServerSnapshot);
}
