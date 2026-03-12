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
  rotationDir: 1 | -1;
  rotationSpeed: number;
  opacityScale: number;
  deformationScale: number;
  signalData: FusionSignalData;
  reducedMotion: boolean;
};

const GhostRingMesh = ({
  radius,
  tube,
  rotationDir,
  rotationSpeed,
  opacityScale,
  deformationScale,
  signalData,
  reducedMotion,
}: GhostRingMeshProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const currentSignalsRef = useRef<Float32Array>(new Float32Array(12));
  const { camera } = useThree();

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    const material = materialRef.current;
    if (!group || !material) return;

    // Rotate the ghost ring
    group.rotation.z += rotationDir * rotationSpeed * delta;

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
  });

  return (
    <group ref={groupRef} rotation={[0, 0, Math.PI / 2]}>
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
};

/**
 * Two ghost copies of the main ring that create a layered gyroscope effect.
 *
 * - Inner ghost (r=2.4): counter-rotates, slightly less deformation
 * - Outer halo  (r=3.7): slow co-rotation, very light presence
 */
export const GhostRings = ({ signalData, reducedMotion }: GhostRingsProps) => {
  return (
    <>
      {/* Inner ghost — counter-clockwise, medium opacity */}
      <GhostRingMesh
        radius={2.4}
        tube={0.12}
        rotationDir={-1}
        rotationSpeed={0.28}
        opacityScale={0.28}
        deformationScale={0.7}
        signalData={signalData}
        reducedMotion={reducedMotion}
      />

      {/* Outer halo — slow clockwise, very translucent */}
      <GhostRingMesh
        radius={3.7}
        tube={0.08}
        rotationDir={1}
        rotationSpeed={0.04}
        opacityScale={0.13}
        deformationScale={0.4}
        signalData={signalData}
        reducedMotion={reducedMotion}
      />
    </>
  );
};
