"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { RefObject } from "react";
import type { ScrollState } from "@/lib/useScrollProgress";
import { CHAPTER_COUNT, flowModeFor, mulberry32 } from "./chapters";

const PARTICLES = 520;
/** Discrete lanes so the flow reads as defined paths rather than noise. */
const LANES = 26;

/**
 * Positions are derived entirely from `uTime` and per-particle attributes, so
 * nothing is written from JavaScript per frame. Branching is on a uniform, which
 * every invocation takes identically — no warp divergence.
 */
const VERTEX = /* glsl */ `
  attribute float aLane;
  attribute float aOffset;
  attribute float aSpeed;
  attribute vec3 aJitter;

  uniform float uTime;
  uniform float uMode;
  uniform float uFade;
  uniform float uSize;
  uniform float uPixelRatio;

  varying float vAlpha;

  void main() {
    float phase = fract(aOffset + uTime * aSpeed * 0.16);
    vec3 p;

    if (uMode < 1.5) {
      // Chapter 3 — climb the factory stack: PLC/sensor at the bottom up to the
      // executive dashboard on top. x is fixed per lane so paths read vertically.
      float x = (aLane - 0.5) * 21.0;
      float y = mix(-5.25, 5.25, phase);
      p = vec3(x + aJitter.x * 0.45, y, aJitter.z * 4.6);
      vAlpha = smoothstep(0.0, 0.12, phase) * (1.0 - smoothstep(0.86, 1.0, phase));
    } else {
      // Chapter 4 — circulate the value chain loop.
      float a = (aLane + phase) * 6.2831853;
      p = vec3(cos(a) * 8.0, sin(a) * 8.0 * 0.6, sin(a * 2.0) * 1.8) + aJitter * 1.1;
      vAlpha = 1.0;
    }

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float dist = max(-mv.z, 0.001);
    vAlpha *= clamp(1.0 - (dist - 7.0) / 30.0, 0.0, 1.0) * uFade;
    gl_PointSize = uSize * uPixelRatio * (26.0 / dist);
  }
`;

const FRAGMENT = /* glsl */ `
  precision mediump float;

  uniform vec3 uColor;

  varying float vAlpha;

  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d);
    if (r > 0.5) discard;

    float core = smoothstep(0.5, 0.0, r);
    float a = pow(core, 2.0) * vAlpha;
    if (a < 0.004) discard;

    gl_FragColor = vec4(uColor, a);
  }
`;

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** Ramp the flow in and out inside its own chapter so mode changes never pop. */
function flowOpacity(mode: number, t: number) {
  if (mode === 0) return 0;
  return Math.min(smoothstep(0, 0.18, t), 1 - smoothstep(0.82, 1, t));
}

export function DataFlow({ scroll }: { scroll: RefObject<ScrollState> }) {
  const { geometry, material, uniforms } = useMemo(() => {
    const rand = mulberry32(0xf10a);

    const lane = new Float32Array(PARTICLES);
    const offset = new Float32Array(PARTICLES);
    const speed = new Float32Array(PARTICLES);
    const jitter = new Float32Array(PARTICLES * 3);

    for (let i = 0; i < PARTICLES; i++) {
      lane[i] = Math.floor(rand() * LANES) / (LANES - 1);
      offset[i] = rand();
      speed[i] = 0.55 + rand() * 0.9;
      jitter[i * 3 + 0] = rand() - 0.5;
      jitter[i * 3 + 1] = rand() - 0.5;
      jitter[i * 3 + 2] = rand() - 0.5;
    }

    const geometry = new THREE.BufferGeometry();
    // `position` is required by three even though the shader ignores it.
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PARTICLES * 3), 3));
    geometry.setAttribute("aLane", new THREE.BufferAttribute(lane, 1));
    geometry.setAttribute("aOffset", new THREE.BufferAttribute(offset, 1));
    geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    geometry.setAttribute("aJitter", new THREE.BufferAttribute(jitter, 3));

    const uniforms = {
      uTime: { value: 0 },
      uMode: { value: 1 },
      uFade: { value: 0 },
      uSize: { value: 1 },
      uPixelRatio: { value: 1 },
      uColor: { value: new THREE.Color("#67e8f9") },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });

    return { geometry, material, uniforms };
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  const ref = useRef<THREE.Points>(null);

  useFrame(({ clock, gl }) => {
    const s = scroll.current;
    const points = ref.current;
    if (!s || !points) return;

    const chapter = Math.min(CHAPTER_COUNT, Math.max(1, s.chapter));
    const mode = flowModeFor(chapter);
    const opacity = flowOpacity(mode, s.chapterProgress);

    // Skip the draw call entirely outside chapters 3 and 4. Mutating the object
    // directly rather than through state keeps React out of the render loop.
    points.visible = opacity > 0.001;
    if (!points.visible) return;

    uniforms.uMode.value = mode;
    uniforms.uFade.value = opacity;
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uPixelRatio.value = gl.getPixelRatio();
  });

  return (
    <points ref={ref} geometry={geometry} material={material} frustumCulled={false} />
  );
}
