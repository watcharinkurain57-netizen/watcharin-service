import type Lenis from "lenis";

/**
 * Module-level handle on the lenis instance.
 *
 * Overlays need to actually pause momentum scrolling, not just set
 * `body { overflow: hidden }` — lenis drives `window.scrollTo` itself and does
 * not care what the body overflow says. Kept deliberately tiny: a store or
 * context would drag React re-renders into something that only ever needs to
 * call two methods on one object.
 */
let instance: Lenis | null = null;
let depth = 0;

export function registerSmoothScroll(lenis: Lenis | null) {
  instance = lenis;
}

/** Nestable: two overlays open at once still only resume once both close. */
export function pauseSmoothScroll() {
  depth += 1;
  instance?.stop();
}

export function resumeSmoothScroll() {
  depth = Math.max(0, depth - 1);
  if (depth === 0) instance?.start();
}
