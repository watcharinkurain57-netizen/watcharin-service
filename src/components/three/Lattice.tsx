"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { RefObject } from "react";
import type { ScrollState } from "@/lib/useScrollProgress";
import type { PointerState } from "@/lib/usePointer";
import type { DeviceTier } from "@/lib/useDeviceTier";
import {
  CHAPTER_COUNT,
  buildEdgeSets,
  buildLayouts,
  cameraFor,
  mulberry32,
  nodeCountFor,
} from "./chapters";

/**
 * The morph happens here, in the vertex shader: `mix(aFrom, aTo, uMix)`.
 * Both the nodes and the connecting lines run this same shader over the same
 * buffers, so the wiring follows the nodes for free.
 */
const VERTEX = /* glsl */ `
  attribute vec3 aFrom;
  attribute vec3 aTo;
  attribute float aSeed;

  uniform float uMix;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;

  varying float vDepthFade;

  void main() {
    vec3 p = mix(aFrom, aTo, uMix);

    // Slow idle drift so the lattice breathes instead of sitting dead still.
    float t = uTime * 0.22 + aSeed * 6.2831853;
    p += vec3(sin(t), cos(t * 0.87), sin(t * 1.31)) * 0.18;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float dist = max(-mv.z, 0.001);
    vDepthFade = clamp(1.0 - (dist - 7.0) / 30.0, 0.0, 1.0);
    gl_PointSize = uSize * uPixelRatio * (34.0 / dist);
  }
`;

/**
 * Additive soft sprite. This stands in for a bloom pass — real postprocessing
 * would cost ~40KB plus a full-screen render target for a difference nobody
 * can see at these point sizes.
 */
const POINT_FRAGMENT = /* glsl */ `
  precision mediump float;

  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uFade;

  varying float vDepthFade;

  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d);
    if (r > 0.5) discard;

    float core = smoothstep(0.5, 0.0, r);
    float a = pow(core, 2.4) * vDepthFade * uFade;
    if (a < 0.003) discard;

    gl_FragColor = vec4(mix(uColorB, uColorA, core), a);
  }
`;

const LINE_FRAGMENT = /* glsl */ `
  precision mediump float;

  uniform vec3 uColorA;
  uniform float uFade;

  varying float vDepthFade;

  void main() {
    gl_FragColor = vec4(uColorA, 0.15 * vDepthFade * uFade);
  }
`;

export function Lattice({
  tier,
  scroll,
  pointer,
}: {
  tier: DeviceTier;
  scroll: RefObject<ScrollState>;
  pointer: RefObject<PointerState>;
}) {
  const built = useMemo(() => {
    const count = nodeCountFor(tier);
    const layouts = buildLayouts(count);
    const edgeSets = buildEdgeSets(layouts, tier === 2 ? 240 : 110);

    // One BufferAttribute per chapter layout, uploaded lazily by three the
    // first time each is bound. 2600 nodes is ~31KB per layout.
    const positionAttrs = layouts.map((l) =>
      l.length ? new THREE.BufferAttribute(l, 3) : null,
    );
    const indexAttrs = edgeSets.map((e) =>
      e.length ? new THREE.BufferAttribute(e, 1) : null,
    );

    const rand = mulberry32(0x5eed);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) seeds[i] = rand();
    const seedAttr = new THREE.BufferAttribute(seeds, 1);

    const pointsGeometry = new THREE.BufferGeometry();
    const lineGeometry = new THREE.BufferGeometry();
    for (const g of [pointsGeometry, lineGeometry]) {
      g.setAttribute("aSeed", seedAttr);
    }

    const uniforms = {
      uMix: { value: 0 },
      uTime: { value: 0 },
      uFade: { value: 0 },
      uSize: { value: tier === 2 ? 1 : 1.2 },
      uPixelRatio: { value: 1 },
      uColorA: { value: new THREE.Color("#6ee7b7") },
      uColorB: { value: new THREE.Color("#0e7490") },
    };

    const shared = {
      uniforms,
      vertexShader: VERTEX,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    } as const;

    const pointMaterial = new THREE.ShaderMaterial({
      ...shared,
      fragmentShader: POINT_FRAGMENT,
    });
    const lineMaterial = new THREE.ShaderMaterial({
      ...shared,
      fragmentShader: LINE_FRAGMENT,
    });

    return {
      positionAttrs,
      indexAttrs,
      pointsGeometry,
      lineGeometry,
      pointMaterial,
      lineMaterial,
      uniforms,
    };
  }, [tier]);

  const {
    positionAttrs,
    indexAttrs,
    pointsGeometry,
    lineGeometry,
    pointMaterial,
    lineMaterial,
    uniforms,
  } = built;

  // useMemo objects are ours to clean up; R3F only auto-disposes what it created.
  useEffect(
    () => () => {
      pointsGeometry.dispose();
      lineGeometry.dispose();
      pointMaterial.dispose();
      lineMaterial.dispose();
    },
    [pointsGeometry, lineGeometry, pointMaterial, lineMaterial],
  );

  const boundChapter = useRef(-1);

  useFrame(({ camera, clock, gl }, delta) => {
    const s = scroll.current;
    if (!s) return;

    const chapter = Math.min(CHAPTER_COUNT, Math.max(1, s.chapter));

    // Swap the morph pair only when the chapter changes — six times per page,
    // not per frame. Chapter N blends layout N into layout N+1, so mix=1 of
    // one chapter is exactly mix=0 of the next and the seam is invisible.
    if (boundChapter.current !== chapter) {
      boundChapter.current = chapter;
      const from = positionAttrs[chapter];
      const to = positionAttrs[chapter + 1] ?? from;
      if (from && to) {
        for (const g of [pointsGeometry, lineGeometry]) {
          g.setAttribute("position", from);
          g.setAttribute("aFrom", from);
          g.setAttribute("aTo", to);
        }
      }
      const index = indexAttrs[chapter];
      if (index) lineGeometry.setIndex(index);
    }

    // Assigned, not damped: chapterProgress is already continuous, and damping
    // would lag the value across a boundary and break that exact seam.
    uniforms.uMix.value = s.chapterProgress;
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uPixelRatio.value = gl.getPixelRatio();

    const target = cameraFor(chapter, s.chapterProgress);

    // The camera *is* damped: scroll events arrive in bursts and a raw mapping
    // makes the motion stutter. Frame-rate independent.
    // Cursor parallax rides on top of the scroll choreography. Small on purpose:
    // enough that the scene feels alive under the mouse, not enough to fight the
    // camera move the scroll is driving. Zero on touch, where usePointer no-ops.
    const p = pointer.current ?? { x: 0, y: 0 };
    const k = 3.5;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, target.x + p.x * 0.9, k, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, target.y - p.y * 0.55, k, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, target.z, k, delta);
    camera.lookAt(0, 0, 0);
    uniforms.uFade.value = THREE.MathUtils.damp(
      uniforms.uFade.value,
      target.fade,
      2.2,
      delta,
    );
  });

  return (
    <group>
      {/* frustumCulled off: the shader displaces vertices, so three's bounding
          sphere is a lie and culling would pop the scene out of existence. */}
      <lineSegments
        geometry={lineGeometry}
        material={lineMaterial}
        frustumCulled={false}
      />
      <points
        geometry={pointsGeometry}
        material={pointMaterial}
        frustumCulled={false}
      />
    </group>
  );
}
