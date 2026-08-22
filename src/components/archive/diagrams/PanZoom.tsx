"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ZOOM_STEP, clampZoom, fitView, zoomAt as zoomAtView, type View } from "@/lib/pan-zoom";

/**
 * กล่องเลื่อน/ซูมสำหรับผัง
 *
 * ผังสถาปัตยกรรมของงานจริงกว้างกว่าจอเสมอ ก่อนหน้านี้ปล่อยให้ย่อพอดีกล่อง
 * ซึ่งแปลว่าผังยิ่งใหญ่ยิ่งอ่านไม่ออก — ผัง ER 20 ตารางย่อลงมาเหลือตัวหนังสือ
 * ขนาดเท่ามด ต้องซูมด้วยเบราว์เซอร์ทั้งหน้าถึงจะอ่านได้
 *
 * ---------------------------------------------------------------------------
 * เรื่องล้อเมาส์ที่ตั้งใจทำแบบนี้
 *
 * กล่องที่ฝังอยู่กลางหน้าไม่ควรกินการหมุนล้อธรรมดา เพราะคนที่ตั้งใจเลื่อนหน้า
 * ลงไปอ่านของข้างล่างจะโดนผังดูดเมาส์ไว้แล้วซูมแทน ซึ่งน่ารำคาญมาก
 * ในกล่องปกติจึงซูมด้วย **Ctrl/⌘ + ล้อ** เท่านั้น ล้อเปล่าปล่อยให้หน้าเลื่อนตามปกติ
 *
 * ส่วนตอนขยายเต็มจอไม่มีอะไรอยู่ข้างหลังให้เลื่อน ล้อเปล่าจึงซูมได้เลย
 * ---------------------------------------------------------------------------
 */

const btn =
  "grid size-8 flex-none place-items-center rounded-lg border border-line bg-surface-raised/90 text-[0.95rem] font-bold text-ink-muted transition-colors hover:border-brand-500 hover:text-brand-300";

export function PanZoom({
  svg,
  /** เต็มจอ = ไม่มีอะไรอยู่ข้างหลัง ล้อเปล่าจึงซูมได้ */
  immersive = false,
  className = "",
}: {
  svg: string;
  immersive?: boolean;
  className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const [grabbing, setGrabbing] = useState(false);

  /** ตัวชี้ที่กดค้างอยู่ — เก็บไว้เพื่อรู้ว่ากำลังลากนิ้วเดียวหรือหุบสองนิ้ว */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; k: number; cx: number; cy: number; x: number; y: number } | null>(null);

  /** ขนาดจริงของผัง อ่านจาก viewBox — ต้องรู้ก่อนถึงจะคำนวณ "พอดีจอ" ได้ */
  const natural = useRef({ w: 0, h: 0 });

  const fit = useCallback(() => {
    const box = wrap.current?.getBoundingClientRect();
    if (!box) return;
    const next = fitView(box, natural.current);
    if (next) setView(next);
  }, []);

  /** ใส่ผังลง DOM แล้ววัดขนาด — ต้องทำก่อน paint ไม่งั้นจะเห็นผังกระโดดตอนจัดพอดีจอ */
  useLayoutEffect(() => {
    const el = holder.current;
    if (!el) return;

    el.innerHTML = svg;
    const node = el.querySelector("svg");

    if (node) {
      const vb = (node.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
      natural.current =
        vb.length === 4 && vb[2] > 0
          ? { w: vb[2], h: vb[3] }
          : { w: node.clientWidth || 800, h: node.clientHeight || 600 };

      // บังคับให้ svg กางเต็มขนาดจริงของมัน ไม่ใช่ย่อพอดีกล่อง
      // การย่อเป็นหน้าที่ของ transform ข้างนอก จะได้ซูมกลับเข้าไปได้คมชัด
      node.setAttribute("width", String(natural.current.w));
      node.setAttribute("height", String(natural.current.h));
      node.style.maxWidth = "none";
      node.style.display = "block";
    }

    fit();
  }, [svg, fit]);

  /** จอเปลี่ยนขนาด (หมุนมือถือ / ย่อหน้าต่าง) ก็จัดพอดีใหม่ */
  useEffect(() => {
    const box = wrap.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(box);
    return () => ro.disconnect();
  }, [fit]);

  const zoomAt = useCallback((factor: number, px: number, py: number) => {
    setView((v) => zoomAtView(v, factor, px, py));
  }, []);

  const zoomCenter = useCallback(
    (factor: number) => {
      const box = wrap.current?.getBoundingClientRect();
      if (box) zoomAt(factor, box.width / 2, box.height / 2);
    },
    [zoomAt]
  );

  /**
   * ต้องผูก wheel เองด้วย passive:false — React ผูกให้แบบ passive
   * ซึ่ง preventDefault ไม่ทำงาน แล้วหน้าจะเลื่อนตามไปด้วยตอนกำลังซูม
   */
  useEffect(() => {
    const box = wrap.current;
    if (!box) return;

    const onWheel = (e: WheelEvent) => {
      const wantZoom = immersive || e.ctrlKey || e.metaKey;
      if (!wantZoom) return; // ปล่อยให้หน้าเลื่อนตามปกติ

      e.preventDefault();
      const r = box.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP, e.clientX - r.left, e.clientY - r.top);
    };

    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
  }, [zoomAt, immersive]);

  /* ---------- ลากนิ้วเดียว = เลื่อน · สองนิ้ว = หุบเข้าออก ---------- */

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setGrabbing(true);
    gesture.current = null;
  }

  function onPointerMove(e: React.PointerEvent) {
    const pts = pointers.current;
    if (!pts.has(e.pointerId)) return;

    const prev = pts.get(e.pointerId) as { x: number; y: number };
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pts.size === 1) {
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
      return;
    }

    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const box = wrap.current?.getBoundingClientRect();
      if (!box) return;

      const cx = (a.x + b.x) / 2 - box.left;
      const cy = (a.y + b.y) / 2 - box.top;

      // จำระยะกับมุมมองตอนเริ่มหุบไว้ แล้วคิดจากฐานนั้นเสมอ
      // ถ้าคิดจากเฟรมก่อนหน้าทีละนิด ความคลาดเคลื่อนจะสะสมจนภาพไถล
      if (!gesture.current) {
        setView((v) => {
          gesture.current = { dist, k: v.k, cx, cy, x: v.x, y: v.y };
          return v;
        });
        return;
      }

      const g = gesture.current;
      const k = clampZoom(g.k * (dist / g.dist));
      setView({ k, x: g.cx - (g.cx - g.x) * (k / g.k), y: g.cy - (g.cy - g.y) * (k / g.k) });
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    gesture.current = null;
    if (pointers.current.size === 0) setGrabbing(false);
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border border-line bg-surface-raised ${className}`}>
      <div
        ref={wrap}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => zoomCenter(ZOOM_STEP)}
        // touch-action:none = ให้เราจัดการนิ้วเองทั้งหมด ไม่ให้เบราว์เซอร์แย่งไปเลื่อนหน้า
        className={`size-full touch-none select-none ${grabbing ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <div
          ref={holder}
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
            transformOrigin: "0 0",
            width: "max-content",
          }}
        />
      </div>

      {/* ปุ่มลอยมุมขวาล่าง — ไม่บังตัวผังซึ่งมักเริ่มจากมุมซ้ายบน */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-xl border border-line bg-surface/80 p-1 backdrop-blur">
        <button type="button" onClick={() => zoomCenter(1 / ZOOM_STEP)} className={btn} aria-label="ซูมออก">
          −
        </button>
        <span className="w-11 text-center text-[0.72rem] font-bold tabular-nums text-ink-faint">
          {Math.round(view.k * 100)}%
        </span>
        <button type="button" onClick={() => zoomCenter(ZOOM_STEP)} className={btn} aria-label="ซูมเข้า">
          +
        </button>
        <button
          type="button"
          onClick={fit}
          className="rounded-lg border border-line bg-surface-raised/90 px-2.5 py-1.5 text-[0.72rem] font-bold text-ink-muted transition-colors hover:border-brand-500 hover:text-brand-300"
        >
          พอดีจอ
        </button>
      </div>

      {!immersive && (
        <p className="pointer-events-none absolute bottom-3 left-3 text-[0.7rem] text-ink-faint">
          ลากเพื่อเลื่อน · Ctrl + ล้อเพื่อซูม
        </p>
      )}
    </div>
  );
}
