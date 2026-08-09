/**
 * Layouts, wiring, camera targets and node budgets for the scroll-driven scene.
 *
 * The morph is done entirely on the GPU. Every chapter's layout is baked once
 * into a Float32Array; two of them are bound as the `aFrom` / `aTo` attributes
 * and each frame only the scalar `uMix` uniform moves. Per-frame CPU cost is
 * zero no matter how many nodes there are. GLSL cannot index attributes
 * dynamically, so the pair is swapped on the CPU at chapter boundaries — six
 * times in the whole page — instead of uploading all six layouts at once.
 */
import type { DeviceTier } from "@/lib/useDeviceTier";

/** Deterministic RNG so every layout looks the same on every render. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CHAPTER_COUNT = 6;
/** Nodes are assigned to groups by `i % GROUPS`, shared by every layout, so a
 *  capability cluster morphs into the matching factory tier rather than
 *  scattering. Four groups: Web / Mobile / AI / Industrial → EDGE / MES / ERP / BI. */
export const GROUPS = 4;
export const RING_NODES = 5;

export function nodeCountFor(tier: DeviceTier): number {
  return tier === 2 ? 2600 : 700;
}

/** Uniform-ish point inside a sphere of `radius`, centred on `c`. */
function sphere(
  out: Float32Array,
  i: number,
  c: readonly [number, number, number],
  radius: number,
  rand: () => number,
) {
  const theta = rand() * Math.PI * 2;
  const phi = Math.acos(2 * rand() - 1);
  const r = radius * Math.cbrt(rand());
  out[i * 3 + 0] = c[0] + r * Math.sin(phi) * Math.cos(theta);
  out[i * 3 + 1] = c[1] + r * Math.sin(phi) * Math.sin(theta);
  out[i * 3 + 2] = c[2] + r * Math.cos(phi);
}

/** Chapter 1 — a jittered lattice slab. Wide and shallow so it reads as a
 *  system diagram floating in the dark, not a ball of stars. */
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

/** Chapter 2 — four clusters in a row, echoing the four capability cards. */
export function clustersLayout(count: number, rand: () => number): Float32Array {
  const pos = new Float32Array(count * 3);
  const spread = 9.5;
  const centers: [number, number, number][] = [];
  for (let g = 0; g < GROUPS; g++) {
    const t = g / (GROUPS - 1);
    centers.push([
      (t - 0.5) * 2 * spread,
      (g % 2 === 0 ? 1 : -1) * 1.5,
      (rand() - 0.5) * 2.5,
    ]);
  }
  for (let i = 0; i < count; i++) sphere(pos, i, centers[i % GROUPS], 2.7, rand);
  return pos;
}

/** Chapter 3 — four stacked slabs: EDGE → MES → ERP → BI, bottom to top.
 *  This is the section that sells factory work, so the geometry is literally
 *  the architecture diagram. */
export function tierStackLayout(count: number, rand: () => number): Float32Array {
  const pos = new Float32Array(count * 3);
  const W = 21;
  const D = 5;
  const gap = 3.5;
  for (let i = 0; i < count; i++) {
    const tier = i % GROUPS;
    pos[i * 3 + 0] = (rand() - 0.5) * W;
    pos[i * 3 + 1] = (tier - (GROUPS - 1) / 2) * gap + (rand() - 0.5) * 0.85;
    pos[i * 3 + 2] = (rand() - 0.5) * D;
  }
  return pos;
}

/** Chapter 4 — five orbs on a ring: the ecosystem value chain as a closed loop. */
export function ringLayout(count: number, rand: () => number): Float32Array {
  const pos = new Float32Array(count * 3);
  const R = 8;
  for (let i = 0; i < count; i++) {
    const n = i % RING_NODES;
    const a = (n / RING_NODES) * Math.PI * 2 - Math.PI / 2;
    sphere(
      pos,
      i,
      [Math.cos(a) * R, Math.sin(a) * R * 0.6, Math.sin(a * 2) * 1.8],
      2,
      rand,
    );
  }
  return pos;
}

/** Chapters 5–6 — the structure recedes into a calm shell so the copy leads. */
export function starfieldLayout(count: number, rand: () => number): Float32Array {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    const r = 17 + rand() * 15;
    pos[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.7;
    pos[i * 3 + 2] = r * Math.cos(phi) * 0.6 - 7;
  }
  return pos;
}

/** Index 0 is unused so the array indexes by 1-based chapter number.
 *  A 7th entry mirrors chapter 6 so the last chapter always has a morph target. */
export function buildLayouts(count: number): Float32Array[] {
  const ch6 = starfieldLayout(count, mulberry32(0x6f));
  return [
    new Float32Array(0),
    latticeLayout(count, mulberry32(0x1a)),
    clustersLayout(count, mulberry32(0x2b)),
    tierStackLayout(count, mulberry32(0x3c)),
    ringLayout(count, mulberry32(0x4d)),
    starfieldLayout(count, mulberry32(0x5e)),
    ch6,
    ch6,
  ];
}

type EdgeArray = Uint16Array | Uint32Array;

function packEdges(pairs: number[], count: number): EdgeArray {
  return count > 65535 ? new Uint32Array(pairs) : new Uint16Array(pairs);
}

/** Short connections between nearby nodes. Only a few hundred — wiring every
 *  node would be expensive to draw and visually noisy. */
export function buildNearEdges(
  positions: Float32Array,
  rand: () => number,
  maxEdges: number,
  maxDist: number,
): EdgeArray {
  const count = positions.length / 3;
  const pairs: number[] = [];
  const seen = new Set<number>();
  const maxDistSq = maxDist * maxDist;

  for (let attempt = 0; attempt < maxEdges * 10 && pairs.length < maxEdges * 2; attempt++) {
    const a = Math.floor(rand() * count);
    let best = -1;
    let bestSq = Infinity;
    for (let s = 0; s < 24; s++) {
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
  return packEdges(pairs, count);
}

/**
 * Wiring for the tier stack: each edge climbs from a node in one tier to a
 * node directly above it. Nearest-neighbour wiring would produce horizontal
 * lines inside each slab, which says nothing — the story of this scene is data
 * moving upward from the machines to the dashboard.
 */
export function buildTierEdges(
  positions: Float32Array,
  rand: () => number,
  maxEdges: number,
): EdgeArray {
  const count = positions.length / 3;
  const pairs: number[] = [];
  const seen = new Set<number>();

  for (let attempt = 0; attempt < maxEdges * 12 && pairs.length < maxEdges * 2; attempt++) {
    const a = Math.floor(rand() * count);
    const tier = a % GROUPS;
    if (tier === GROUPS - 1) continue; // nothing above the top tier
    const targetTier = tier + 1;

    let best = -1;
    let bestDx = Infinity;
    for (let s = 0; s < 40; s++) {
      const b = Math.floor(rand() * count);
      if (b % GROUPS !== targetTier) continue;
      const dx = Math.abs(positions[a * 3] - positions[b * 3]);
      if (dx < bestDx) {
        bestDx = dx;
        best = b;
      }
    }
    if (best < 0 || bestDx > 2.6) continue;
    const key = a * count + best;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push(a, best);
  }
  return packEdges(pairs, count);
}

/** Wiring for the ring: edges hop between adjacent orbs so the loop closes. */
export function buildRingEdges(
  positions: Float32Array,
  rand: () => number,
  maxEdges: number,
): EdgeArray {
  const count = positions.length / 3;
  const pairs: number[] = [];
  const seen = new Set<number>();

  for (let attempt = 0; attempt < maxEdges * 12 && pairs.length < maxEdges * 2; attempt++) {
    const a = Math.floor(rand() * count);
    const targetNode = ((a % RING_NODES) + 1) % RING_NODES;
    let best = -1;
    let bestSq = Infinity;
    for (let s = 0; s < 40; s++) {
      const b = Math.floor(rand() * count);
      if (b % RING_NODES !== targetNode) continue;
      const dx = positions[a * 3] - positions[b * 3];
      const dy = positions[a * 3 + 1] - positions[b * 3 + 1];
      const dz = positions[a * 3 + 2] - positions[b * 3 + 2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < bestSq) {
        bestSq = d2;
        best = b;
      }
    }
    if (best < 0) continue;
    const key = a * count + best;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push(a, best);
  }
  return packEdges(pairs, count);
}

/** Edge sets indexed by 1-based chapter, matching buildLayouts. */
export function buildEdgeSets(
  layouts: Float32Array[],
  budget: number,
): EdgeArray[] {
  return [
    packEdges([], 0),
    buildNearEdges(layouts[1], mulberry32(0xa1), budget, 3.4),
    buildNearEdges(layouts[2], mulberry32(0xa2), budget, 2.2),
    buildTierEdges(layouts[3], mulberry32(0xa3), budget),
    buildRingEdges(layouts[4], mulberry32(0xa4), Math.round(budget * 0.7)),
    buildNearEdges(layouts[5], mulberry32(0xa5), Math.round(budget * 0.4), 4.5),
    buildNearEdges(layouts[6], mulberry32(0xa6), Math.round(budget * 0.4), 4.5),
  ];
}

/** Particle flow mode per chapter: 0 off, 1 upward through the tiers, 2 around the ring. */
export function flowModeFor(chapter: number): 0 | 1 | 2 {
  if (chapter === 3) return 1;
  if (chapter === 4) return 2;
  return 0;
}

export type ChapterCamera = {
  x: [number, number];
  y: [number, number];
  z: [number, number];
  /** Scene opacity at chapter start and end — the copy has to stay readable. */
  fade: [number, number];
};

/**
 * Chapter 1 owns the screen; chapter 3 comes back forward because the factory
 * stack is the scene that sells the work; chapter 5 recedes so the long-form
 * copy leads.
 *
 * Fades are deliberately conservative outside the hero. These numbers are the
 * first thing to tune once someone can actually look at the page — they were
 * chosen to be safe for legibility rather than dramatic.
 */
export const CHAPTER_CAMERAS: Record<number, ChapterCamera> = {
  1: { x: [0, 0], y: [0, 0.6], z: [21, 14], fade: [1, 0.9] },
  2: { x: [0, 3], y: [0.6, 1], z: [14, 18], fade: [0.9, 0.5] },
  3: { x: [3, 0], y: [1, 0.4], z: [18, 15], fade: [0.5, 0.62] },
  4: { x: [0, -2], y: [0.4, 0.2], z: [15, 17], fade: [0.62, 0.55] },
  5: { x: [-2, 0], y: [0.2, 1.2], z: [17, 23], fade: [0.55, 0.2] },
  6: { x: [0, 0], y: [1.2, 1.6], z: [23, 21], fade: [0.2, 0.35] },
};

export function cameraFor(chapter: number, t: number) {
  const c = CHAPTER_CAMERAS[chapter] ?? CHAPTER_CAMERAS[CHAPTER_COUNT];
  const lerp = (pair: [number, number]) => pair[0] + (pair[1] - pair[0]) * t;
  return { x: lerp(c.x), y: lerp(c.y), z: lerp(c.z), fade: lerp(c.fade) };
}
