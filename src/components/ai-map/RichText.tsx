import { Fragment } from "react";

/**
 * ข้อความในเครื่องหมาย `...` แสดงเป็นโค้ด ที่เหลือเป็นข้อความธรรมดา
 * ไม่มี hook — ใช้ได้ทั้งใน server component และ client component
 */
export function RichText({ text }: { text: string }) {
  return text.split("`").map((part, i) =>
    i % 2 === 1 ? (
      <code
        key={i}
        className="rounded-md bg-surface-overlay px-1.5 py-0.5 font-mono text-[0.85em] text-ink"
      >
        {part}
      </code>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}
