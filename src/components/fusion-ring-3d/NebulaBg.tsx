import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ── Inline GLSL ──────────────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  #define PI 3.14159265359

  uniform float uTime;
  uniform float uTransitIntensity;

  varying vec2 vUv;

  // 5-octave FBM — richer than the ring shader's 4-octave version
  float fbm(vec2 p) {
    float val  = 0.0;
    float amp  = 0.5;
    float freq = 1.0;
    float ox   = 0.0;
    for (int i = 0; i < 5; i++) {
      val += amp * sin(p.x * freq + uTime * 0.05 + ox)
                 * cos(p.y * freq * 1.2 + uTime * 0.04);
      ox   += 1.9;
      freq *= 2.0;
      amp  *= 0.48;
    }
    return val * 0.5 + 0.5;
  }

  void main() {
    // Slow horizontal UV drift — nebula never stands still
    vec2 uv = vUv + vec2(uTime * 0.003, uTime * 0.001);

    float n1 = fbm(uv * 1.8);
    float n2 = fbm(uv * 3.6 + vec2(n1 * 0.5, 0.0));
    float n3 = fbm(uv * 7.2 + vec2(n2 * 0.3, n1 * 0.25));

    // Layered nebula density
    float nebula = n2 * 0.55 + n3 * 0.45;

    // ── Colour system ─────────────────────────────────────────────
    // Base: deep violet ↔ midnight teal driven by transit intensity
    vec3 bgViolet = vec3(0.06, 0.0, 0.13);
    vec3 bgTeal   = vec3(0.0,  0.08, 0.11);
    vec3 baseColor = mix(bgViolet, bgTeal, uTransitIntensity);

    // Wisp accents: purple ↔ cyan
    vec3 wispViolet = vec3(0.28, 0.04, 0.48);
    vec3 wispCyan   = vec3(0.0,  0.42, 0.50);
    vec3 wispColor  = mix(wispViolet, wispCyan, uTransitIntensity);

    // Subtle gold filaments where FBM peaks
    float gold = pow(max(0.0, n1 - 0.6) * 2.5, 2.0);
    vec3 goldColor = vec3(0.5, 0.35, 0.05) * gold * 0.4;

    vec3 color = baseColor + wispColor * nebula * 0.30 + goldColor;

    // ── Radial vignette — fade hard at edges ──────────────────────
    vec2  center   = vUv - 0.5;
    float vignette = clamp(1.0 - dot(center, center) * 2.8, 0.0, 1.0);

    // Alpha: opaque in centre, transparent at screen edge
    float alpha = vignette * 0.92;

    gl_FragColor = vec4(color * vignette, alpha);
  }
`;

// ── Props ────────────────────────────────────────────────────────────────────

type NebulaBgProps = {
  transitIntensity: number;
};

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Full-screen background plane with a scrolling FBM nebula.
 *
 * Sits at z=-7 (well behind the ring at z=0). The camera is at z=9,
 * so the plane needs to be large enough to fill the viewport:
 *   half-height at distance 16 = 16 * tan(22.5°) ≈ 6.6 units → use 20×20.
 *
 * Colour shifts between deep violet and midnight teal based on
 * `transitIntensity`, making the cosmos react to planetary activity.
 */
export const NebulaBg = ({ transitIntensity }: NebulaBgProps) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime:             { value: 0 },
      uTransitIntensity: { value: transitIntensity },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state) => {
    const mat = materialRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value             = state.clock.elapsedTime;
    mat.uniforms.uTransitIntensity.value = transitIntensity;
  });

  return (
    <mesh position={[0, 0, -7]}>
      <planeGeometry args={[20, 20]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
      />
    </mesh>
  );
};
