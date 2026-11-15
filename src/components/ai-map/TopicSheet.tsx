"use client";

import { useEffect, useRef } from "react";
import type { TopicId } from "@/lib/ai-map";
import { TopicPanel } from "./TopicPanel";

const TITLE_ID = "ai-map-sheet-title";

/**
 * รายละเอียดหัวข้อบนจอเล็ก — แผ่นที่เลื่อนขึ้นจากขอบล่าง
 *
 * ของที่กล่องซ้อนหน้าต้องมีให้ครบ แบบเดียวกับ archive/Modal:
 *   - ปิดด้วย Esc และแตะพื้นหลัง
 *   - ล็อกการเลื่อนของหน้าข้างหลัง
 *   - บอกเครื่องอ่านหน้าจอว่านี่คือ dialog และชื่อว่าอะไร
 * เพิ่มจาก Modal: ย้ายโฟกัสเข้ามาในแผ่นตอนเปิด และคืนโฟกัสให้ปุ่มที่เปิดตอนปิด
 * คนที่ใช้คีย์บอร์ดหรือเครื่องอ่านหน้าจอจะได้ไม่หลงอยู่ข้างหลังพื้นทึบ
 *
 * แผ่นค้างอยู่ตอนกด ก่อนหน้า / ถัดไป — เปลี่ยนแค่เนื้อหา effect ข้างล่างจึงรันครั้งเดียวตอนเปิด
 */
export function TopicSheet({
  id,
  onClose,
  onPick,
}: {
  id: TopicId;
  onClose: () => void;
  onPick: (id: TopicId) => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // preventScroll — ตอนเปิดแผ่นยังเลื่อนขึ้นมาไม่สุด (แอนิเมชัน) focus ธรรมดาจะพาหน้าข้างหลังเลื่อนตาม
    sheetRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prevOverflow;
      opener?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={sheetRef}
        tabIndex={-1}
        className="sheet-up flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface-raised shadow-2xl"
      >
        <div aria-hidden="true" className="mx-auto mt-2.5 h-1.5 w-10 flex-none rounded-full bg-line-strong" />
        <TopicPanel id={id} headingId={TITLE_ID} onClose={onClose} onPick={onPick} />
      </div>
    </div>
  );
}
