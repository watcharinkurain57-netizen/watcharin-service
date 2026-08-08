/**
 * Layouts, camera targets and node budgets for the scroll-driven scene.
 *
 * The morph is done entirely on the GPU: every layout is baked once into a
 * Float32Array, two of them are bound as the `aFrom` / `aTo` attributes, and
 * each frame only the scalar `uMix` uniform is interpolated. That keeps the
 * per-frame CPU cost at zero no matter how many nodes there are. GLSL cannot
 * index attributes dynamically, which is why the pair is swapped on the CPU at
 * chapter boundaries (six times in the whole page) instead of passing all five
 * layouts at once.
 */
import type { DeviceTier } from "@/lib/useDeviceTier";

/** Deterministic RNG so the lattice looks the same on every render. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function nodeCountFor(tier: DeviceTier): number {
  return tier === 2 ? 2600 : 700;
}

/**
 * Chapter 1 — a jittered lattice slab. Wide and shallow so it reads as a
 * system diagram floating in the dark rather than a ball of stars.
 */
export function latticeLayout(count: number, rand: () => number): Float32Array {
  const pos = new Float32Array(count * 3);
  const W = 26;
  const H = 13;
  const D = 8;

  const layers = 4;
  const perLayer = Math.ceil(count / layers);
  const cols = Math.max(2, Math.ceil(Math.sqrt(perLayer * 2.1)));
  const rows = Math.max(2, Math.ceil(perLayer / cols));

  const jx = (W / cols) * 0.85;
  const jy = (H / rows) * 0.85;

  let i = 0;
  for (let l = 0; l < layers && i < count; l++) {
    for (let r = 0; r < rows && i < count; r++) {
      for (let c = 0; c < cols && i < count; c++, i++) {
        pos[i * 3 + 0] = (c / (cols - 1) - 0.5) * W + (rand() - 0.5) * jx;
        pos[i * 3 + 1] = (r / (rows - 1) - 0.5) * H + (rand() - 0.5) * jy;
        pos[i * 3 + 2] = (l / (layers - 1) - 0.5) * D + (rand() - 0.5) * 0.7;
      }
    }
  }
  return pos;
}

/**
 * Short connections between nearby nodes. Only a curated few hundred — wiring
 * every node would be both expensive and visually noisy.
 */
export function buildEdges(
  positions: Float32Array,
  rand: () => number,
  maxEdges = 240,
): Uint16Array | Uint32Array {
  const count = positions.length / 3;
  const pairs: number[] = [];
  const seen = new Set<number>();
  const maxDistSq = 3.4 * 3.4;
  const samples = 24;

  for (let attempt = 0; attempt < maxEdges * 8 && pairs.length < maxEdges * 2; attempt++) {
    const a = Math.floor(rand() * count);
    let best = -1;
    let bestSq = Infinity;

    for (let s = 0; s < samples; s++) {
      const b = Math.floor(rand() * count);
      if (b === a) continue;
      const dx = positions[a * 3] - positions[b * 3];
      const dy = positions[a * 3 + 1] - positions[b * 3 + 1];
      const dz = positions[a * 3 + 2] - positions[b * 3 + 2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < bestSq) {
        bestSq = d2;
        best = b;
      }
    }

    if (best < 0 || bestSq > maxDistSq) continue;
    const lo = Math.min(a, best);
    const hi = Math.max(a, best);
    const key = lo * count + hi;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push(lo, hi);
  }

  return count > 65535 ? new Uint32Array(pairs) : new Uint16Array(pairs);
}

export type ChapterCamera = {
  /** Camera z at the start and end of the chapter. */
  z: [number, number];
  /** Camera y at the start and end of the chapter. */
  y: [number, number];
  /** Scene opacity at the start and end — text has to stay readable. */
  fade: [number, number];
};

/**
 * Only chapter 1 has bespoke choreography in this phase. The rest ease the
 * camera back and dim the scene so it sits behind the copy as texture; their
 * real layouts arrive with the remaining chapters.
 */
export const CHAPTER_CAMERAS: Record<number, ChapterCamera> = {
  1: { z: [21, 14], y: [0, 0.6], fade: [1, 0.95] },
  2: { z: [14, 19], y: [0.6, 1.2], fade: [0.95, 0.34] },
  3: { z: [19, 21], y: [1.2, 1.6], fade: [0.34, 0.3] },
  4: { z: [21, 22], y: [1.6, 2], fade: [0.3, 0.28] },
  5: { z: [22, 23], y: [2, 2.4], fade: [0.28, 0.24] },
  6: { z: [23, 24], y: [2.4, 2.8], fade: [0.24, 0.3] },
};

export function cameraFor(chapter: number, t: number) {
  const c = CHAPTER_CAMERAS[chapter] ?? CHAPTER_CAMERAS[6];
  const lerp = (a: number, b: number) => a + (b - a) * t;
  return {
    z: lerp(c.z[0], c.z[1]),
    y: lerp(c.y[0], c.y[1]),
    fade: lerp(c.fade[0], c.fade[1]),
  };
}
