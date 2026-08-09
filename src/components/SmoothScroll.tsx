"use client";

import { useEffect } from "react";
import type Lenis from "lenis";
import { registerSmoothScroll } from "@/lib/smoothScrollControl";

/** Matches the `scroll-margin-top` given to anchor targets in globals.css. */
const NAV_OFFSET = 80;

/**
 * Momentum scrolling, which is what makes the scroll-driven scene feel like one
 * continuous motion rather than a series of jumps.
 *
 * Three things this is careful about:
 * - It is skipped entirely under `prefers-reduced-motion`. Hijacking scroll is
 *   the single most disorienting thing you can do to someone who asked for less
 *   motion.
 * - Anchor links are handled explicitly, with a native fallback, because the nav
 *   and footer are full of them and silently breaking them would be worse than
 *   not having smooth scroll at all.
 * - lenis is dynamically imported so it never lands in the initial bundle.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let lenis: Lenis | null = null;
    let raf = 0;
    let cancelled = false;

    // Works with or without lenis, and keeps working if the import fails.
    const scrollToId = (id: string) => {
      const target = document.getElementById(id);
      if (!target) return false;

      if (!lenis) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return true;
      }

      const startY = window.scrollY;
      const wanted = target.getBoundingClientRect().top + startY - NAV_OFFSET;
      // force: overlays (mobile nav, project modal) pause lenis while open, and
      // their links close the overlay in the same click. React commits that state
      // change *after* this handler runs, so without force the scroll would be
      // issued against a still-stopped instance and quietly do nothing.
      lenis.scrollTo(target, { offset: -NAV_OFFSET, force: true });

      // Safety net. A nav click that changes the URL but leaves the page where
      // it was is a worse bug than having no momentum scrolling at all, so if
      // nothing has moved shortly after, jump there the plain way.
      window.setTimeout(() => {
        const moved = Math.abs(window.scrollY - startY) > 2;
        const needed = Math.abs(wanted - startY) > 8;
        if (!moved && needed) target.scrollIntoView({ behavior: "auto", block: "start" });
      }, 300);

      return true;
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.<HTMLAnchorElement>(
        'a[href^="#"]',
      );
      const id = anchor?.getAttribute("href")?.slice(1);
      if (!id) return;

      if (scrollToId(id)) {
        event.preventDefault();
        history.pushState(null, "", `#${id}`);
      }
    };

    document.addEventListener("click", onClick);

    import("lenis")
      .then(({ default: LenisCtor }) => {
        if (cancelled) return;
        lenis = new LenisCtor({
          duration: 1.05,
          smoothWheel: true,
          // Leave touch alone: native momentum on phones is better than anything
          // we would emulate, and overriding it breaks pull-to-refresh.
          syncTouch: false,
        });
        registerSmoothScroll(lenis);
        // CSS smooth scrolling and lenis fight each other for the same scroll.
        document.documentElement.classList.remove("scroll-smooth");

        const loop = (time: number) => {
          lenis?.raf(time);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      })
      .catch(() => {
        // Native smooth scrolling stays in place; anchors still work.
      });

    return () => {
      cancelled = true;
      document.removeEventListener("click", onClick);
      if (raf) cancelAnimationFrame(raf);
      registerSmoothScroll(null);
      lenis?.destroy();
      document.documentElement.classList.add("scroll-smooth");
    };
  }, []);

  return null;
}
