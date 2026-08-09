"use client";

import { useEffect, useRef, useState } from "react";
import { pauseSmoothScroll, resumeSmoothScroll } from "@/lib/smoothScrollControl";
import type { NavLink } from "./navLinks";

/**
 * The phone-sized nav. Without this there is no way to reach any section on a
 * phone at all — the desktop link row is `hidden md:flex`, so a mobile visitor
 * got the logo and a Contact button and nothing else.
 */
export function MobileNav({ links }: { links: readonly NavLink[] }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    // body overflow alone is not enough: lenis drives window.scrollTo itself.
    pauseSmoothScroll();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      resumeSmoothScroll();
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    // Send focus back where it came from rather than dumping it at the top.
    triggerRef.current?.focus();
  };

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-ink-muted transition hover:border-brand-400/50 hover:text-ink"
      >
        <span aria-hidden className="relative block h-3.5 w-5">
          <span
            className={`absolute left-0 block h-0.5 w-5 rounded bg-current transition-transform duration-200 ${
              open ? "top-1.5 rotate-45" : "top-0"
            }`}
          />
          <span
            className={`absolute left-0 top-1.5 block h-0.5 w-5 rounded bg-current transition-opacity duration-200 ${
              open ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute left-0 block h-0.5 w-5 rounded bg-current transition-transform duration-200 ${
              open ? "top-1.5 -rotate-45" : "top-3"
            }`}
          />
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="ปิดเมนู"
            onClick={close}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          />
          <div
            ref={panelRef}
            id="mobile-nav-panel"
            className="fixed inset-x-3 top-[4.5rem] z-50 rounded-2xl border border-line bg-surface-raised p-2 shadow-2xl"
          >
            <nav aria-label="เมนูหลัก">
              <ul className="flex flex-col">
                {links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={close}
                      className="block rounded-xl px-4 py-3 text-base font-medium text-ink-muted transition hover:bg-surface-overlay hover:text-ink"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <a
              href="#contact"
              onClick={close}
              className="gradient-btn mt-2 block rounded-xl px-4 py-3 text-center text-base font-semibold text-white"
            >
              ปรึกษาโปรเจค →
            </a>
          </div>
        </>
      )}
    </div>
  );
}
