import { useSyncExternalStore } from "react";
import { isTopicId, type TopicId } from "@/lib/ai-map";

/**
 * สถานะของหน้า /ai-map — เก็บไว้นอก React แล้วอ่านผ่าน useSyncExternalStore
 *
 * หัวข้อที่เลือกอยู่ใน URL (#mcp) ไม่ใช่ state ของคอมโพเนนต์ เพราะ
 *   - ส่งลิงก์หัวข้อไหนให้ใคร เปิดมาก็เจอหัวข้อนั้นเลย
 *   - ลิงก์หัวข้อในส่วนอื่นของหน้า (ขั้นตอน, ลำดับการเรียน) แค่เปลี่ยน hash ก็เลือกได้
 *     ไม่ต้องห่อทั้งหน้าไว้ใน context เดียวกัน ส่วนที่เหลือของหน้าจึงยังเป็น server component
 *
 * ⚠️ ใช้ useSyncExternalStore ด้วยเหตุผลเดียวกับ useHashToken ใน lib/demo/session-store
 * ฝั่งเซิร์ฟเวอร์ไม่มี URL และ localStorage ให้อ่าน ถ้าอ่านตอน render แรกจะ hydrate ไม่ตรงกัน
 * และการ setState ใน effect ก็ทำให้เรนเดอร์ซ้ำโดยไม่จำเป็น
 */

// ---------- หัวข้อที่เลือก ----------

const SELECT_EVENT = "ai-map:select";

function subscribeSelected(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener(SELECT_EVENT, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener(SELECT_EVENT, onChange);
  };
}

function selectedFromUrl(): TopicId | null {
  const id = window.location.hash.slice(1);
  return isTopicId(id) ? id : null;
}

const nothingOnServer = () => null;

export function useSelectedTopic(): TopicId | null {
  return useSyncExternalStore(subscribeSelected, selectedFromUrl, nothingOnServer);
}

/**
 * เปลี่ยนหัวข้อด้วย replaceState ไม่ใช่ location.hash
 * — location.hash ทำให้เบราว์เซอร์กระโดดไปที่ปุ่มทุกครั้ง และทุกการกดกลายเป็นหนึ่งหน้าในประวัติ
 *   กดย้อนกลับทีเดียวควรออกจากหน้านี้ ไม่ใช่ไล่ย้อนทีละหัวข้อ
 * replaceState ไม่ยิง hashchange จึงต้องบอกคนที่ฟังอยู่เอง
 */
export function selectTopic(id: TopicId | null) {
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", id ? `#${id}` : `${pathname}${search}`);
  window.dispatchEvent(new Event(SELECT_EVENT));
}

// ---------- จอใหญ่ / จอเล็ก ----------

/** ต้องตรงกับ breakpoint lg ของ Tailwind (64rem) — แผงข้างแผนที่ใช้ lg:block */
const DESKTOP_QUERY = "(min-width: 64rem)";

function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const desktopNow = () => window.matchMedia(DESKTOP_QUERY).matches;
const mobileOnServer = () => false;

export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribeDesktop, desktopNow, mobileOnServer);
}

function scrollToChip(id: TopicId, block: ScrollLogicalPosition) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "instant" : "smooth", block });
}

/**
 * เลือกหัวข้อจากที่อื่นที่ไม่ใช่ปุ่มบนแผนที่
 *
 * จอใหญ่: รายละเอียดอยู่ในแผงข้างแผนที่ ถ้าไม่เลื่อนไปหาปุ่ม คนที่กดจากส่วนล่างของหน้า
 * จะไม่เห็นว่ามีอะไรเปลี่ยน — `center` สำหรับลิงก์จากส่วนอื่นของหน้า,
 * `nearest` สำหรับปุ่มในแผงรายละเอียดเอง ซึ่งแผนที่อยู่ในจออยู่แล้ว ขยับแค่พอให้เห็นปุ่ม
 *
 * จอเล็ก: รายละเอียดเปิดเป็นแผ่นซ้อนหน้า ไม่ต้องเลื่อนหน้าข้างหลังให้หลงตำแหน่ง
 */
export function revealTopic(id: TopicId, block: ScrollLogicalPosition = "center") {
  selectTopic(id);
  if (desktopNow()) scrollToChip(id, block);
}

// ---------- หัวข้อที่ทบทวนแล้ว ----------

const REVIEWED_KEY = "ai-map:reviewed";
const REVIEWED_EVENT = "ai-map:reviewed";
const NONE: ReadonlySet<TopicId> = new Set();

/*
 * localStorage ใช้ไม่ได้ในบางที่ (โหมดส่วนตัวของบางเบราว์เซอร์ ปิดการเก็บข้อมูลเว็บ)
 * พอพังครั้งแรกก็ย้ายมาจำในตัวแปรแทน — ติ๊กยังใช้ได้ระหว่างเปิดหน้าอยู่ แค่ไม่จำข้ามครั้ง
 */
let inMemory = false;
let memoryRaw: string | null = null;

function readRaw(): string | null {
  if (!inMemory) {
    try {
      return window.localStorage.getItem(REVIEWED_KEY);
    } catch {
      inMemory = true;
    }
  }
  return memoryRaw;
}

function writeRaw(raw: string | null) {
  if (!inMemory) {
    try {
      if (raw === null) window.localStorage.removeItem(REVIEWED_KEY);
      else window.localStorage.setItem(REVIEWED_KEY, raw);
    } catch {
      inMemory = true;
    }
  }
  if (inMemory) memoryRaw = raw;
  window.dispatchEvent(new Event(REVIEWED_EVENT));
}

function parseReviewed(raw: string | null): ReadonlySet<TopicId> {
  if (!raw) return NONE;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter(isTopicId)) : NONE;
  } catch {
    return NONE;
  }
}

/*
 * useSyncExternalStore เทียบผลด้วย Object.is — ถ้าสร้าง Set ใหม่ทุกครั้งที่ถาม
 * React จะนึกว่าค่าเปลี่ยนตลอดแล้ววนเรนเดอร์ไม่จบ จึงจำ Set เดิมไว้จนกว่าข้อความดิบจะเปลี่ยน
 */
let cachedRaw: string | null | undefined;
let cachedSet: ReadonlySet<TopicId> = NONE;

function reviewedNow(): ReadonlySet<TopicId> {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSet = parseReviewed(raw);
  }
  return cachedSet;
}

function subscribeReviewed(onChange: () => void) {
  // storage = ติ๊กจากอีกแท็บ
  window.addEventListener("storage", onChange);
  window.addEventListener(REVIEWED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(REVIEWED_EVENT, onChange);
  };
}

const noneOnServer = () => NONE;

export function useReviewed(): ReadonlySet<TopicId> {
  return useSyncExternalStore(subscribeReviewed, reviewedNow, noneOnServer);
}

export function setReviewed(id: TopicId, done: boolean) {
  const next = new Set(reviewedNow());
  if (done) next.add(id);
  else next.delete(id);
  writeRaw(next.size > 0 ? JSON.stringify([...next]) : null);
}

export function resetReviewed() {
  writeRaw(null);
}
