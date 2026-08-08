"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useDeviceTier } from "@/lib/useDeviceTier";

// ssr:false keeps three.js out of the server bundle and out of the initial
// JS payload — it arrives as its own lazy chunk only once we decide to mount.
const Scene = dynamic(() => import("./Scene").then((m) => m.Scene), {
  ssr: false,
});

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * Decides whether the WebGL scene runs at all, and makes sure it never
 * competes with hydration or the largest-contentful paint.
 *
 * Tier 0 (reduced motion, save-data, no WebGL) mounts nothing — not a hidden
 * canvas, nothing. The page keeps its CSS background and is complete without
 * this layer.
 */
export function SceneLayer() {
  const tier = useDeviceTier();
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    const w = window as IdleWindow;

    if (w.requestIdleCallback) {
      const handle = w.requestIdleCallback(() => setIdle(true), { timeout: 2500 });
      return () => w.cancelIdleCallback?.(handle);
    }

    // Safari has no requestIdleCallback.
    const timer = window.setTimeout(() => setIdle(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  if (tier === null || tier === 0 || !idle) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <Scene tier={tier} />
    </div>
  );
}
