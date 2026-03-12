import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ── Sector colour palette (mirrors RingMesh SECTOR_COLORS) ───────────────────
const SECTOR_COLORS_THREE = [
  new THREE.Color('#E63946'),
  new THREE.Color('#C9A227'),
  new THREE.Color('#E9C46A'),
  new THREE.Color('#A8DADC'),
  new THREE.Color('#F4A261'),
  new THREE.Color('#6B9080'),
  new THREE.Color('#D4A5A5'),
  new THREE.Color('#9B2335'),
  new THREE.Color('#7B2D8E'),
  new THREE.Color('#2B2D42'),
  new THREE.Color('#00B4D8'),
  new THREE.Color('#48BFE3'),
];

// ── Inline GLSL ──────────────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  attribute float aAngle;
  attribute float aRadius;
  attribute float aOrbitSpeed;   // positive = CW, negative = CCW
  attribute float aSize;

  uniform float uTime;
  uniform float uTransitIntensity;

  varying float vSector;
  varying float vAlpha;

  void main() {
    float angle = aAngle + uTime * aOrbitSpeed;

    // Subtle radial breath
    float r = aRadius + sin(uTime * 0.6 + aAngle * 3.0) * 0.05;

    vec3 pos = vec3(cos(angle) * r, sin(angle) * r, position.z);

    // Map current angle to 0-12 sector index for colour
    vSector = mod((angle / 6.28318530718) * 12.0 + 120.0, 12.0);

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    // Size attenuation (larger at close range)
    gl_PointSize = aSize * (120.0 / max(0.1, -mvPos.z));
    gl_Position  = projectionMatrix * mvPos;

    vAlpha = 0.30 + uTransitIntensity * 0.50;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColors[12];

  varying float vSector;
  varying float vAlpha;

  vec3 readColor(int index) {
    vec3 c = vec3(1.0);
    for (int i = 0; i < 12; i++) {
      if (i == index) c = uColors[i];
    }
    return c;
  }

  void main() {
    // Circular particle with smooth falloff — discard corners
    vec2 coord = gl_PointCoord - 0.5;
    float dist  = length(coord);
    if (dist > 0.5) discard;

    float falloff = 1.0 - dist * 2.0;
    falloff = pow(falloff, 1.8);

    int   idx0  = int(floor(vSector));
    int   idx1  = int(mod(float(idx0 + 1), 12.0));
    float blend = fract(vSector);

    vec3 color = mix(readColor(idx0), readColor(idx1), blend) * 1.6;
    gl_FragColor = vec4(color, falloff * vAlpha);
  }
`;

// ── Attribute generators ─────────────────────────────────────────────────────

function makeParticleRing(
  count: number,
  speedRange: [number, number], // [min, max], negative for CCW
  radiusRange: [number, number],
  sizeRange: [number, number],
  zSpread: number,
) {
  const angles   = new Float32Array(count);
  const radii    = new Float32Array(count);
  const speeds   = new Float32Array(count);
  const sizes    = new Float32Array(count);
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const t = i / count;
    angles[i]   = t * Math.PI * 2 + Math.random() * 0.3;
    radii[i]    = radiusRange[0] + Math.random() * (radiusRange[1] - radiusRange[0]);
    sizes[i]    = sizeRange[0]  + Math.random() * (sizeRange[1]   - sizeRange[0]);
    speeds[i]   = speedRange[0] + Math.random() * (speedRange[1]  - speedRange[0]);
    positions[i * 3 + 2] = (Math.random() - 0.5) * zSpread;
  }

  return { angles, radii, speeds, sizes, positions };
}

// ── Props ────────────────────────────────────────────────────────────────────

type EnergyParticlesProps = {
  transitIntensity: number;
  reducedMotion: boolean;
};

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Dual-orbit particle system with sector-aware colouring.
 *
 *  • Primary ring  (600 particles) — slow clockwise orbit, full sector palette
 *  • Counter ring  (300 particles) — counter-clockwise orbit, larger radius,
 *                                     subtler opacity
 *
 * All GPU-side: positions are computed each frame in the vertex shader via
 * uTime + per-particle aAngle / aRadius / aOrbitSpeed attributes.
 */
export const EnergyParticles = ({ transitIntensity, reducedMotion }: EnergyParticlesProps) => {
  // Shared uniforms — both <shaderMaterial> instances read from the same object
  const uniforms = useMemo(
    () => ({
      uTime:             { value: 0 },
      uTransitIntensity: { value: transitIntensity },
      uColors:           { value: SECTOR_COLORS_THREE },
    }),
    // Intentionally stable — transitIntensity updated imperatively each frame
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Primary ring — clockwise
  const primary = useMemo(
    () => makeParticleRing(
      reducedMotion ? 200 : 600,
      [0.10, 0.24],
      [2.55, 4.15],
      [1.8, 3.8],
      0.75,
    ),
    [reducedMotion],
  );

  // Counter ring — counter-clockwise
  const counter = useMemo(
    () => makeParticleRing(
      reducedMotion ? 80 : 280,
      [-0.17, -0.09],
      [2.75, 4.05],
      [1.2, 2.8],
      0.60,
    ),
    [reducedMotion],
  );

  useFrame((state) => {
    uniforms.uTime.value             = state.clock.elapsedTime;
    uniforms.uTransitIntensity.value = transitIntensity;
  });

  const matProps = {
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  } as const;

  return (
    <>
      {/* Primary orbit */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={primary.positions} count={primary.positions.length / 3} itemSize={3} />
          <bufferAttribute attach="attributes-aAngle"   array={primary.angles}    count={primary.angles.length}          itemSize={1} />
          <bufferAttribute attach="attributes-aRadius"  array={primary.radii}     count={primary.radii.length}           itemSize={1} />
          <bufferAttribute attach="attributes-aOrbitSpeed" array={primary.speeds} count={primary.speeds.length}          itemSize={1} />
          <bufferAttribute attach="attributes-aSize"    array={primary.sizes}     count={primary.sizes.length}           itemSize={1} />
        </bufferGeometry>
        <shaderMaterial {...matProps} />
      </points>

      {/* Counter orbit */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={counter.positions} count={counter.positions.length / 3} itemSize={3} />
          <bufferAttribute attach="attributes-aAngle"   array={counter.angles}    count={counter.angles.length}          itemSize={1} />
          <bufferAttribute attach="attributes-aRadius"  array={counter.radii}     count={counter.radii.length}           itemSize={1} />
          <bufferAttribute attach="attributes-aOrbitSpeed" array={counter.speeds} count={counter.speeds.length}          itemSize={1} />
          <bufferAttribute attach="attributes-aSize"    array={counter.sizes}     count={counter.sizes.length}           itemSize={1} />
        </bufferGeometry>
        <shaderMaterial {...matProps} />
      </points>
    </>
  );
};
