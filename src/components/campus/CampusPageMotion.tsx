"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useCampusMotion } from "./CampusShell";

/** Moves only visible project imagery; native scrolling remains unchanged. */
export function CampusPageMotion() {
  const marker = useRef<HTMLSpanElement>(null);
  const pathname = usePathname();
  const { reduced } = useCampusMotion();
  useEffect(() => {
    const frames = Array.from(
      marker.current
        ?.closest("main")
        ?.querySelectorAll<HTMLElement>("[data-campus-parallax]") ?? [],
    );
    if (reduced) {
      for (const frame of frames) frame.style.removeProperty("--image-shift");
      return;
    }
    const visible = new Set<HTMLElement>();
    let raf = 0;
    const update = () => {
      raf = 0;
      if (document.hidden) return;
      for (const frame of visible) {
        const rect = frame.getBoundingClientRect();
        const progress = Math.max(
          -1,
          Math.min(
            1,
            (rect.top + rect.height / 2 - innerHeight / 2) / innerHeight,
          ),
        );
        frame.style.setProperty("--image-shift", `${progress * 3}%`);
      }
    };
    const schedule = () => {
      if (!raf && visible.size) raf = requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target as HTMLElement);
        else visible.delete(entry.target as HTMLElement);
      }
      schedule();
    });
    for (const frame of frames) observer.observe(frame);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", schedule);
      for (const frame of frames) frame.style.removeProperty("--image-shift");
    };
  }, [pathname, reduced]);
  return <span ref={marker} hidden aria-hidden="true" />;
}
