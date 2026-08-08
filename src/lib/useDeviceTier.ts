"use client";

import { useEffect, useState } from "react";

/**
 * How much WebGL this visitor gets.
 *
 * 0 — no canvas is mounted at all. The page falls back to the CSS background.
 * 1 — reduced scene: fewer nodes, no particle flow, lower DPR. Phones and
 *     low-core laptops land here so the page never cooks a battery.
 * 2 — full scene.
 */
export type DeviceTier = 0 | 1 | 2;

type NavigatorWithHints = Navigator & {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
};

export function detectDeviceTier(): DeviceTier {
  if (typeof window === "undefined") return 0;

  // Respecting this is not optional — an animated background is exactly what
  // reduced-motion users are asking us not to do.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return 0;

  const nav = navigator as NavigatorWithHints;
  if (nav.connection?.saveData) return 0;

  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  try {
    const probe = document.createElement("canvas");
    gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
  } catch {
    return 0;
  }
  if (!gl) return 0;
  // Browsers allow only a handful of live contexts, so hand this probe back
  // before the real canvas asks for one.
  gl.getExtension("WEBGL_lose_context")?.loseContext();

  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  if (window.innerWidth < 768 || cores <= 4 || memory <= 4) return 1;

  return 2;
}

/**
 * `null` on the server — SSR must never guess a tier.
 *
 * Detection runs in the state initialiser rather than in an effect: doing it in
 * an effect means an extra render pass for every visitor, and the consumer
 * renders nothing until it has a tier anyway, so there is no hydration
 * mismatch to worry about.
 */
export function useDeviceTier(): DeviceTier | null {
  const [tier, setTier] = useState<DeviceTier | null>(() =>
    typeof window === "undefined" ? null : detectDeviceTier(),
  );

  useEffect(() => {
    // A visitor can flip reduced-motion mid-session; honour it immediately.
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setTier(detectDeviceTier());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return tier;
}
