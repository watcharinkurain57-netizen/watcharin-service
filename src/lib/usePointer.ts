"use client";

import { useEffect, useRef, type RefObject } from "react";

export type PointerState = {
  /** -1 (left) .. 1 (right) */
  x: number;
  /** -1 (top) .. 1 (bottom) */
  y: number;
};

/**
 * Normalised cursor position, reported through a ref so the render loop can
 * sample it without re-rendering React.
 *
 * Does nothing on touch devices: there is no hovering finger to follow, and
 * listening for pointermove there would just mean the scene lurches on every tap.
 */
export function usePointer(): RefObject<PointerState> {
  const pointer = useRef<PointerState>({ x: 0, y: 0 });

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return pointer;
}
