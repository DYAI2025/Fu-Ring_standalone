import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type EnergyParticlesProps = {
  transitIntensity: number;
  reducedMotion: boolean;
};

const PARTICLE_COUNT = 900;

export const EnergyParticles = ({ transitIntensity, reducedMotion }: EnergyParticlesProps) => {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, sizes } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const pointSizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      const radius = 2.5 + Math.random() * 1.7;
      const angle = Math.random() * Math.PI * 2;
      const z = (Math.random() - 0.5) * 0.8;

      pos[i * 3 + 0] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = Math.sin(angle) * radius;
      pos[i * 3 + 2] = z;

      pointSizes[i] = 0.5 + Math.random() * 1.6;
    }

    return { positions: pos, sizes: pointSizes };
  }, []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    pointsRef.current.rotation.z += delta * (reducedMotion ? 0.04 : 0.15);
    pointsRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.08;

    const material = pointsRef.current.material;
    if (material instanceof THREE.PointsMaterial) {
      const targetOpacity = 0.25 + Math.max(0, Math.min(1, transitIntensity)) * 0.5;
      material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, Math.min(1, delta * 2));
      material.size = reducedMotion ? 0.018 : 0.022 + transitIntensity * 0.016;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={positions.length / 3}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          array={sizes}
          count={sizes.length}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#9ad8ff"
        transparent
        opacity={0.3}
        size={0.02}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
