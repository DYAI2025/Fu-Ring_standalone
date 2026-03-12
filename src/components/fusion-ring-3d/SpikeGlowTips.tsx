import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TransitEvent } from '@/src/lib/schemas/transit-state';

const SECTOR_COLORS_HEX = [
  '#E63946', '#C9A227', '#E9C46A', '#A8DADC', '#F4A261', '#6B9080',
  '#D4A5A5', '#9B2335', '#7B2D8E', '#2B2D42', '#00B4D8', '#48BFE3',
];

const BASE_RADIUS  = 3;
const SECTOR_STEP  = (Math.PI * 2) / 12;
// Cone geometry in DivergenceSpikes: height=1.05, uniform scale=1+delta*1.8
// Cone is centred at origin so tip is at local y=+height/2=0.525
const CONE_HALF_H  = 0.525;

type SpikeGlowTipsProps = {
  events: TransitEvent[];
};

/**
 * Renders a small glowing sphere at the tip of every active divergence spike.
 * Uses a single InstancedMesh (up to 24 orbs) — same pool cap as DivergenceSpikes.
 *
 * Orb colour matches its sector. A slow breathing pulse is applied via scale
 * animation in useFrame, making each tip feel energetically "live".
 */
export const SpikeGlowTips = ({ events }: SpikeGlowTipsProps) => {
  const meshRef  = useRef<THREE.InstancedMesh>(null);
  const pulseRef = useRef(0);

  const activeEvents = useMemo(
    () => events.filter((e) => e.delta >= 0.18).slice(0, 24),
    [events],
  );

  // Re-position instances whenever events change
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const temp = new THREE.Object3D();

    activeEvents.forEach((event, idx) => {
      const angle = event.sector * SECTOR_STEP;
      const spikeScale = 1 + event.delta * 1.8;
      // Tip radial distance = base_offset + cone half-height scaled
      const tipR = BASE_RADIUS + 0.35 + CONE_HALF_H * spikeScale;

      temp.position.set(
        Math.cos(angle) * tipR,
        Math.sin(angle) * tipR,
        0.1,
      );
      // Orb size grows with delta — more energetic spikes = bigger tip
      const orbScale = 0.07 + event.delta * 0.08;
      temp.scale.setScalar(orbScale);
      temp.updateMatrix();

      mesh.setMatrixAt(idx, temp.matrix);
      mesh.setColorAt(idx, new THREE.Color(SECTOR_COLORS_HEX[event.sector] ?? '#ffffff'));
    });

    mesh.count = activeEvents.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [activeEvents]);

  // Breathing pulse on the whole group
  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const pulse = 1 + Math.sin(state.clock.elapsedTime * 5.5) * 0.18;
    mesh.scale.setScalar(pulse);
  });

  if (activeEvents.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, Math.max(1, activeEvents.length)]}
    >
      <sphereGeometry args={[1, 12, 12]} />
      <meshStandardMaterial
        emissive="#ffffff"
        emissiveIntensity={2.2}
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
      />
    </instancedMesh>
  );
};
