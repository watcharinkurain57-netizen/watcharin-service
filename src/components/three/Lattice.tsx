"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { RefObject } from "react";
import type { ScrollState } from "@/lib/useScrollProgress";
import type { DeviceTier } from "@/lib/useDeviceTier";
import {
  buildEdges,
  cameraFor,
  latticeLayout,
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
 * Additive soft sprite. This is what stands in for a bloom pass — a real
 * postprocessing chain would cost ~40KB and a full-screen render target for a
 * result that is barely distinguishable at these sizes.
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
}: {
  tier: DeviceTier;
  scroll: RefObject<ScrollState>;
}) {
  const { pointsGeometry, lineGeometry, pointMaterial, lineMaterial, uniforms } =
    useMemo(() => {
      const rand = mulberry32(0x5eed);
      const count = nodeCountFor(tier);

      const lattice = latticeLayout(count, rand);
      const seeds = new Float32Array(count);
      for (let i = 0; i < count; i++) seeds[i] = rand();
      const edges = buildEdges(lattice, rand, tier === 2 ? 240 : 110);

      // One buffer per attribute, shared by both geometries so the GPU holds a
      // single copy. `aTo` points at the same layout for now — chapter 2+ swap
      // in their own target and animate uMix.
      const positionAttr = new THREE.BufferAttribute(lattice, 3);
      const seedAttr = new THREE.BufferAttribute(seeds, 1);

      const attach = (geometry: THREE.BufferGeometry) => {
        geometry.setAttribute("position", positionAttr);
        geometry.setAttribute("aFrom", positionAttr);
        geometry.setAttribute("aTo", positionAttr);
        geometry.setAttribute("aSeed", seedAttr);
        return geometry;
      };

      const pointsGeometry = attach(new THREE.BufferGeometry());
      const lineGeometry = attach(new THREE.BufferGeometry());
      lineGeometry.setIndex(new THREE.BufferAttribute(edges, 1));

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

      return { pointsGeometry, lineGeometry, pointMaterial, lineMaterial, uniforms };
    }, [tier]);

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

  useFrame(({ camera, clock, gl }, delta) => {
    const s = scroll.current;
    if (!s) return;

    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uPixelRatio.value = gl.getPixelRatio();

    const target = cameraFor(s.chapter, s.chapterProgress);

    // Damping rather than direct assignment: scroll events arrive in bursts and
    // a raw mapping makes the camera stutter. Frame-rate independent.
    const k = 3.5;
    camera.position.z = THREE.MathUtils.damp(camera.position.z, target.z, k, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, target.y, k, delta);
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
