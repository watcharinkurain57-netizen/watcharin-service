"use client";

import { useEffect, type ReactNode } from "react";

/**
 * กล่องซ้อนหน้า — เปลือกที่ใช้ร่วมกันทุกที่ในคลังโปรเจกต์
 *
 * ก่อนหน้านี้แผงจัดการหมวด/คอลัมน์เป็นแผงที่แทรกลงมาในหน้า ซึ่งมีปัญหาว่า
 * เนื้อหาข้างล่างถูกดันลงไปทั้งก้อน คนที่กำลังดูของอยู่จะเสียตำแหน่งที่มองอยู่
 * และบนจอเล็กแผงกินพื้นที่จนต้องเลื่อนหาว่าของที่จะจัดอยู่ตรงไหน
 *
 * รวมของที่กล่องซ้อนหน้าต้องมีให้ครบไว้ที่เดียว จะได้ไม่ต้องจำใหม่ทุกครั้ง:
 *   - ปิดด้วย Esc และคลิกพื้นหลัง
 *   - ล็อกการเลื่อนของหน้าข้างหลัง
 *   - บอกเครื่องอ่านหน้าจอว่านี่คือ dialog และชื่อว่าอะไร
 */
export function Modal({
  title,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** แถวปุ่มล่างสุดที่ไม่เลื่อนหายไปกับเนื้อหา */
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* my-auto คู่กับ place-items-center — ถ้าเนื้อหาสูงเกินจอ ขอบบนจะได้ไม่โดนตัด */}
      <div
        className={`my-auto flex max-h-[calc(100dvh-2rem)] w-full min-w-0 flex-col rounded-2xl border border-line bg-surface-raised ${
          wide ? "max-w-3xl" : "max-w-xl"
        }`}
      >
        <div className="flex flex-none items-center gap-3 border-b border-line px-5 py-3.5">
          <h3 className="min-w-0 flex-1 truncate text-base font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="flex-none rounded-lg px-2.5 py-1 text-[0.85rem] font-bold text-ink-faint transition-colors hover:text-ink"
          >
            ปิด
          </button>
        </div>

        {/* เนื้อหาเลื่อนในตัวเอง ไม่ใช่ทั้งกล่อง — หัวเรื่องกับแถวปุ่มจะได้อยู่กับที่ */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && <div className="flex-none border-t border-line px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}
