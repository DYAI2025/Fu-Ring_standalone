import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import ringVertexShader from '@/src/shaders/fusion-ring/ring.vert.glsl?raw';
import ringFragmentShader from '@/src/shaders/fusion-ring/ring.frag.glsl?raw';
import type { FusionSignalData } from '@/src/lib/schemas/transit-state';

const SECTOR_COLORS = [
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

type GhostRingMeshProps = {
  radius: number;
  tube: number;
  opacityScale: number;
  deformationScale: number;
  signalData: FusionSignalData;
  reducedMotion: boolean;
  /** Increment to trigger crunch animation on this ghost ring. */
  crunchSeed: number;
};

const GhostRingMesh = ({
  radius,
  tube,
  opacityScale,
  deformationScale,
  signalData,
  reducedMotion,
  crunchSeed,
}: GhostRingMeshProps) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const currentSignalsRef = useRef<Float32Array>(new Float32Array(12));
  const { camera } = useThree();

  // ── Crunch spring ────────────────────────────────────────────
  const crunchPhaseRef = useRef<'idle' | 'crunching' | 'releasing'>('idle');
  const crunchValueRef = useRef<number>(0);

  const uniforms = useMemo(() => ({
    uTime:             { value: 0 },
    uSignals:          { value: new Float32Array(12) },
    uColors:           { value: SECTOR_COLORS },
    uBaseRadius:       { value: radius },
    uDeformationScale: { value: deformationScale },
    uBreathAmplitude:  { value: reducedMotion ? 0 : 0.03 },
    uPulseIntensity:   { value: 0 },
    uKpIndex:          { value: 0 },
    uGlowBlur:         { value: 48 },
    uCameraPos:        { value: new THREE.Vector3() },
    uOpacityScale:     { value: opacityScale },
    uCrunchIntensity:  { value: 0 },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  // Trigger crunch on each ghost ring when seed changes
  useMemo(() => {
    if (crunchSeed === 0) return;
    crunchPhaseRef.current = 'crunching';
    crunchValueRef.current = 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crunchSeed]);

  useFrame((state, delta) => {
    const material = materialRef.current;
    if (!material) return;

    // Ghost rings are now STATIC — no self-rotation.
    // They mirror the main ring deformations at different radii.

    // Update time and camera position
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uCameraPos.value.copy(camera.position);

    // Lerp signals — offset phase slightly from main ring for ghostly drift
    const targetSignals = signalData.targetSignals;
    const current = currentSignalsRef.current;
    for (let i = 0; i < 12; i++) {
      const target = targetSignals[i] ?? 0;
      current[i] = THREE.MathUtils.lerp(current[i], target, Math.min(1, delta * 2.2));
      material.uniforms.uSignals.value[i] = current[i];
    }

    // ── Crunch spring (ghost follows main ring, slight delay via slower lerp) ──
    if (crunchPhaseRef.current === 'crunching') {
      crunchValueRef.current = THREE.MathUtils.lerp(
        crunchValueRef.current, 1, Math.min(1, delta * 14),
      );
      if (crunchValueRef.current > 0.97) crunchPhaseRef.current = 'releasing';
    } else if (crunchPhaseRef.current === 'releasing') {
      crunchValueRef.current = THREE.MathUtils.lerp(
        crunchValueRef.current, 0, Math.min(1, delta * 1.1),
      );
      if (crunchValueRef.current < 0.01) {
        crunchPhaseRef.current = 'idle';
        crunchValueRef.current = 0;
      }
    }

    material.uniforms.uCrunchIntensity.value = crunchValueRef.current;
  });

  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh>
        <torusGeometry args={[radius, tube, 64, 192]} />
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={ringVertexShader}
          fragmentShader={ringFragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};

type GhostRingsProps = {
  signalData: FusionSignalData;
  reducedMotion: boolean;
  crunchSeed: number;
};

/**
 * Two static ghost copies of the main ring at different radii.
 * They show sector deformations at their own scale, amplifying the
 * visual depth of the signal landscape without adding rotation noise.
 *
 * - Inner echo  (r=2.4): lower deformation, shows subtle counter-signal
 * - Outer halo  (r=3.7): very faint, extends the field envelope
 */
export const GhostRings = ({ signalData, reducedMotion, crunchSeed }: GhostRingsProps) => {
  return (
    <>
      {/* Inner echo — static, medium opacity */}
      <GhostRingMesh
        radius={2.4}
        tube={0.12}
        opacityScale={0.28}
        deformationScale={0.9}
        signalData={signalData}
        reducedMotion={reducedMotion}
        crunchSeed={crunchSeed}
      />

      {/* Outer halo — static, very translucent */}
      <GhostRingMesh
        radius={3.7}
        tube={0.08}
        opacityScale={0.13}
        deformationScale={0.5}
        signalData={signalData}
        reducedMotion={reducedMotion}
        crunchSeed={crunchSeed}
      />
    </>
  );
};
