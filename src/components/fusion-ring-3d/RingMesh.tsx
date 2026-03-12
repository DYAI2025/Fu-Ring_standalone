import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import ringVertexShader from '@/src/shaders/fusion-ring/ring.vert.glsl?raw';
import ringFragmentShader from '@/src/shaders/fusion-ring/ring.frag.glsl?raw';
import type { FusionSignalData } from '@/src/lib/schemas/transit-state';

type RingMeshProps = {
  signalData: FusionSignalData;
  kpIndex: number;
  reducedMotion: boolean;
  pulseSeed: number;
};

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

type RingUniforms = {
  uTime: THREE.IUniform<number>;
  uSignals: THREE.IUniform<Float32Array>;
  uColors: THREE.IUniform<THREE.Color[]>;
  uBaseRadius: THREE.IUniform<number>;
  uDeformationScale: THREE.IUniform<number>;
  uBreathAmplitude: THREE.IUniform<number>;
  uPulseIntensity: THREE.IUniform<number>;
  uKpIndex: THREE.IUniform<number>;
  uGlowBlur: THREE.IUniform<number>;
  uCameraPos: THREE.IUniform<THREE.Vector3>;
  uOpacityScale: THREE.IUniform<number>;
};

export const RingMesh = ({ signalData, kpIndex, reducedMotion, pulseSeed }: RingMeshProps) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const currentSignalsRef = useRef<Float32Array>(new Float32Array(12));
  const pulseRef = useRef<number>(0);

  const uniforms = useMemo<RingUniforms>(() => ({
    uTime:             { value: 0 },
    uSignals:          { value: new Float32Array(12) },
    uColors:           { value: SECTOR_COLORS },
    uBaseRadius:       { value: 3 },
    uDeformationScale: { value: 1.35 },
    uBreathAmplitude:  { value: reducedMotion ? 0 : 0.045 },
    uPulseIntensity:   { value: 0 },
    uKpIndex:          { value: kpIndex },
    uGlowBlur:         { value: 36 },
    uCameraPos:        { value: new THREE.Vector3() },
    uOpacityScale:     { value: 1.0 },
  }), [kpIndex, reducedMotion]);

  useEffect(() => {
    uniforms.uKpIndex.value = kpIndex;
  }, [kpIndex, uniforms]);

  useEffect(() => {
    pulseRef.current = 1;
  }, [pulseSeed]);

  useFrame((state, delta) => {
    const material = materialRef.current;
    if (!material) return;

    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uCameraPos.value.copy(state.camera.position);

    const targetSignals = signalData.targetSignals;
    const current = currentSignalsRef.current;

    for (let i = 0; i < 12; i += 1) {
      const target = targetSignals[i] ?? 0;
      current[i] = THREE.MathUtils.lerp(current[i], target, Math.min(1, delta * 3.5));
      material.uniforms.uSignals.value[i] = current[i];
    }

    if (pulseRef.current > 0.001) {
      pulseRef.current = THREE.MathUtils.lerp(pulseRef.current, 0, Math.min(1, delta * 4));
    }

    material.uniforms.uPulseIntensity.value = pulseRef.current;
  });

  return (
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <torusGeometry args={[3, 0.2, 96, 256]} />
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
  );
};
