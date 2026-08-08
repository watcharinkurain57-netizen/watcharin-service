"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Lattice } from "./Lattice";
import { useScrollProgress } from "@/lib/useScrollProgress";
import type { DeviceTier } from "@/lib/useDeviceTier";

export function Scene({ tier }: { tier: DeviceTier }) {
  const scroll = useScrollProgress();
  // Seed from the current visibility rather than assuming true: the tab can
  // already be backgrounded when this mounts, and no visibilitychange event
  // will arrive to correct an optimistic guess.
  const [running, setRunning] = useState(
    () => typeof document === "undefined" || !document.hidden,
  );

  // A backgrounded tab must not keep a render loop alive.
  useEffect(() => {
    const onVisibility = () => setRunning(!document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <Canvas
      frameloop={running ? "always" : "never"}
      // Retina at full DPR quadruples fragment work for a scene made of soft
      // blurs, where nobody can tell. Phones are capped harder still.
      dpr={tier === 2 ? [1, 1.75] : [1, 1.25]}
      // `flat` = no tone mapping: the shader already outputs final colours, and
      // ACES filmic would desaturate the emerald.
      flat
      gl={{
        antialias: false,
        alpha: true,
        powerPreference: "high-performance",
        stencil: false,
        depth: false,
      }}
      camera={{ fov: 45, position: [0, 0, 21], near: 0.1, far: 120 }}
      onCreated={(state) => {
        // Dev-only handle so the scene can be inspected from the console.
        if (process.env.NODE_ENV !== "production") {
          (window as unknown as { __r3f?: unknown }).__r3f = state;
        }
      }}
    >
      <Lattice tier={tier} scroll={scroll} />
    </Canvas>
  );
}
