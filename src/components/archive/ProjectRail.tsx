"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * แถวเลื่อนแนวนอน — ลูกศรซ่อนไว้ โผล่ตอนเอาเมาส์วางบนแถว
 *
 * รายละเอียดที่ตั้งใจทำ:
 * - แถวที่ของไม่เกินจอ จะไม่มีลูกศรและไม่มีขีดบอกหน้าเลย
 * - อยู่ต้นแถวไม่มีลูกศรซ้าย อยู่ท้ายแถวไม่มีลูกศรขวา
 * - จอสัมผัสไม่แสดงลูกศร (ปัดเอาตรง ๆ ดีกว่า และลูกศรจะไปบังการ์ด)
 * - ลูกศรวาดด้วยเส้นขอบ ไม่ใช้ตัวอักษร เพราะฟอนต์ไทยหลายตัวไม่มี glyph ลูกศร
 */
export function ProjectRail({ children }: { children: React.ReactNode }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(0);

  const sync = useCallback(() => {
    const el = railRef.current;
    if (!el) return;

    const max = el.scrollWidth - el.clientWidth;
    if (max <= 8) {
      setCanPrev(false);
      setCanNext(false);
      setPages(0);
      return;
    }

    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < max - 4);

    const total = Math.max(2, Math.ceil(el.scrollWidth / el.clientWidth));
    setPages(total);
    setPage(Math.round((el.scrollLeft / max) * (total - 1)));
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;

    sync();
    el.addEventListener("scroll", sync, { passive: true });

    const ro = new ResizeObserver(sync);
    ro.observe(el);
    // การ์ดใบแรกกว้างเท่าไหร่มีผลกับจำนวนหน้า จึงต้องดูลูกด้วย
    if (el.firstElementChild) ro.observe(el.firstElementChild);

    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [sync]);

  const nudge = (dir: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    const step = Math.max(el.clientWidth * 0.85, 240);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * step, behavior: reduce ? "auto" : "smooth" });
  };

  const arrowBase =
    "absolute top-0 bottom-6 z-20 grid w-14 place-items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:hidden";
  const chevron =
    "block h-3 w-3 border-b-2 border-r-2 border-ink transition-colors group-hover/btn:border-brand-400";

  return (
    <div className="group relative">
      {pages > 0 && (
        <div
          aria-hidden="true"
          className="absolute -top-5 right-1 flex gap-[3px] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        >
          {Array.from({ length: pages }, (_, i) => (
            <span
              key={i}
              className={`block h-[2px] w-3 transition-colors ${
                i === page ? "bg-ink-muted" : "bg-line-strong"
              }`}
            />
          ))}
        </div>
      )}

      {canPrev && (
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label="เลื่อนไปทางซ้าย"
          className={`${arrowBase} group/btn left-0 bg-gradient-to-r from-surface via-surface/60 to-transparent`}
        >
          <span className={`${chevron} ml-1 rotate-[135deg]`} />
        </button>
      )}

      {canNext && (
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label="เลื่อนไปทางขวา"
          className={`${arrowBase} group/btn right-0 bg-gradient-to-l from-surface via-surface/60 to-transparent`}
        >
          <span className={`${chevron} mr-1 -rotate-45`} />
        </button>
      )}

      <div
        ref={railRef}
        className="flex gap-3 overflow-x-auto pb-6 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </div>
  );
}
