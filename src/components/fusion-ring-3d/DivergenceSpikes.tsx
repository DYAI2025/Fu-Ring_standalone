import { useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TransitEvent } from '@/src/lib/schemas/transit-state';

type DivergenceSpikesProps = {
  events: TransitEvent[];
  /** Called when a spike first appears. `delta` is the event magnitude 0-1+. */
  onSpikeEruption: (sector: number, delta: number) => void;
};

const SECTOR_COLORS = [
  '#E63946', '#C9A227', '#E9C46A', '#A8DADC', '#F4A261', '#6B9080',
  '#D4A5A5', '#9B2335', '#7B2D8E', '#2B2D42', '#00B4D8', '#48BFE3',
];

const BASE_RADIUS = 3;
const SECTOR_STEP = (Math.PI * 2) / 12;

export const DivergenceSpikes = ({ events, onSpikeEruption }: DivergenceSpikesProps) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const emittedIdsRef = useRef<Set<string>>(new Set());

  const activeEvents = useMemo(
    () => events.filter((event) => event.delta >= 0.18).slice(0, 24),
    [events],
  );

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const temp = new THREE.Object3D();

    activeEvents.forEach((event, index) => {
      const angle = event.sector * SECTOR_STEP;
      const radial = BASE_RADIUS + 0.35;

      temp.position.set(
        Math.cos(angle) * radial,
        Math.sin(angle) * radial,
        0.1,
      );
      temp.rotation.set(0, 0, angle - Math.PI / 2);
      temp.scale.setScalar(1 + event.delta * 1.8);
      temp.updateMatrix();

      mesh.setMatrixAt(index, temp.matrix);
      mesh.setColorAt(index, new THREE.Color(SECTOR_COLORS[event.sector] ?? '#D4AF37'));

      if (!emittedIdsRef.current.has(event.id)) {
        emittedIdsRef.current.add(event.id);
        onSpikeEruption(event.sector, event.delta);
      }
    });

    mesh.count = activeEvents.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [activeEvents, onSpikeEruption]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const pulse = 1 + Math.sin(state.clock.elapsedTime * 7) * 0.03;
    mesh.scale.setScalar(pulse);
  });

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, Math.max(1, activeEvents.length)]}
      onClick={(event) => {
          const instanceId = event.instanceId;
          const clicked = activeEvents[instanceId ?? -1];
          if (instanceId == null || !clicked) return;
          event.stopPropagation();
          onSpikeEruption(clicked.sector, clicked.delta);
        }}
      >
        <coneGeometry args={[0.16, 1.05, 4]} />
        <meshStandardMaterial
          transparent
          opacity={0.8}
          emissive={'#ffffff'}
          emissiveIntensity={0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexColors
        />
      </instancedMesh>

      {activeEvents.slice(0, 6).map((event) => {
        const angle = event.sector * SECTOR_STEP;
        const x = Math.cos(angle) * (BASE_RADIUS + 1.25);
        const y = Math.sin(angle) * (BASE_RADIUS + 1.25);

        return (
          <Html key={event.id} position={[x, y, 0]} center>
            <div className="pointer-events-none rounded bg-black/70 px-2 py-1 text-[10px] font-mono text-white/85 shadow-lg">
              {event.trigger_symbol || '✦'} S{event.sector}
            </div>
          </Html>
        );
      })}
    </group>
  );
};
