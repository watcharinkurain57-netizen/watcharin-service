"use client";

import { useEffect, useRef, type RefObject } from "react";

export type ScrollState = {
  /** 0..1 across the whole document. */
  progress: number;
  /** 1-based index of the chapter currently filling the viewport. */
  chapter: number;
  /** 0..1 within the active chapter. */
  chapterProgress: number;
  /** Total number of chapters found in the DOM. */
  chapterCount: number;
};

/**
 * Reads the `[data-chapter]` elements rendered by <Chapter> and reports where
 * the reader is.
 *
 * Deliberately returns a ref rather than state: the WebGL loop samples this
 * every frame, and calling setState 60 times a second would re-render the
 * React tree for nothing.
 */
export function useScrollProgress(): RefObject<ScrollState> {
  const state = useRef<ScrollState>({
    progress: 0,
    chapter: 1,
    chapterProgress: 0,
    chapterCount: 0,
  });

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-chapter]"),
    );
    let bounds: { index: number; top: number; height: number }[] = [];

    const update = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      state.current.progress = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;

      // Anchor on the viewport middle so a chapter becomes "active" when it
      // actually dominates the screen, not when its first pixel appears.
      const mid = y + window.innerHeight * 0.5;
      let active = bounds[0];
      for (const b of bounds) {
        if (mid >= b.top) active = b;
      }
      if (active) {
        state.current.chapter = active.index;
        state.current.chapterProgress =
          active.height > 0
            ? Math.min(1, Math.max(0, (mid - active.top) / active.height))
            : 0;
      }
    };

    const measure = () => {
      const scrollY = window.scrollY;
      bounds = elements.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          index: Number(el.dataset.chapter ?? 1),
          top: r.top + scrollY,
          height: r.height,
        };
      });
      state.current.chapterCount = bounds.length;
      update();
    };

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);

    // Chapter heights change when a <details> opens or fonts settle.
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return state;
}
