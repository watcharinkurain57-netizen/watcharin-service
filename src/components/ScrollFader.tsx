"use client";

import { useEffect } from "react";

/** Stagger step between siblings, and the cap so a long grid never crawls. */
const STEP_MS = 70;
const MAX_STEPS = 6;

export function ScrollFader() {
  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>(".scroll-fade"),
    );

    // Cascade siblings instead of popping a whole grid in at once. Done here
    // rather than in markup so every card grid gets it without touching JSX,
    // and reduced-motion still wins because globals.css kills the transition.
    const groups = new Map<Element, HTMLElement[]>();
    for (const el of elements) {
      const parent = el.parentElement;
      if (!parent) continue;
      const group = groups.get(parent);
      if (group) group.push(el);
      else groups.set(parent, [el]);
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      group.forEach((el, i) => {
        if (i > 0) el.style.transitionDelay = `${Math.min(i, MAX_STEPS) * STEP_MS}ms`;
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible");
          // One-shot: keeping these observed means every scroll past re-runs
          // work for elements that are already fully revealed.
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.1 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return null;
}
