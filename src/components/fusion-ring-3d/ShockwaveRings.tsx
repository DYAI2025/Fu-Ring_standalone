import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SECTOR_COLORS_HEX = [
  '#E63946', '#C9A227', '#E9C46A', '#A8DADC', '#F4A261', '#6B9080',
  '#D4A5A5', '#9B2335', '#7B2D8E', '#2B2D42', '#00B4D8', '#48BFE3',
];

const BASE_RADIUS = 3;
const SECTOR_STEP  = (Math.PI * 2) / 12;
const POOL_SIZE    = 6;
const DURATION     = 0.65; // seconds

type WaveData = {
  active:    boolean;
  sector:    number;
  progress:  number;    // 0 → 1
  colorHex:  string;
};

export type ShockwaveRingsHandle = {
  addShockwave: (sector: number) => void;
};

/**
 * Pool of flat ring-discs that expand + fade from each spike's position
 * whenever a sector erupts. Up to POOL_SIZE can fire simultaneously.
 *
 * Usage: call shockwaveRef.current.addShockwave(sector) on spike eruption.
 */
export const ShockwaveRings = forwardRef<ShockwaveRingsHandle>((_, ref) => {
  const meshRefs = useRef<Array<THREE.Mesh | null>>(Array(POOL_SIZE).fill(null));

  const wavesRef = useRef<WaveData[]>(
    Array.from({ length: POOL_SIZE }, () => ({
      active:   false,
      sector:   0,
      progress: 0,
      colorHex: '#ffffff',
    })),
  );

  useImperativeHandle(ref, () => ({
    addShockwave: (sector: number) => {
      const slot = wavesRef.current.findIndex((w) => !w.active);
      if (slot === -1) return;

      const wave      = wavesRef.current[slot];
      wave.active     = true;
      wave.sector     = sector;
      wave.progress   = 0;
      wave.colorHex   = SECTOR_COLORS_HEX[sector] ?? '#ffffff';
    },
  }));

  useFrame((_, delta) => {
    wavesRef.current.forEach((wave, i) => {
      if (!wave.active) return;

      const mesh = meshRefs.current[i];
      if (!mesh) return;

      wave.progress += delta / DURATION;

      if (wave.progress >= 1) {
        wave.active   = false;
        mesh.visible  = false;
        return;
      }

      // Ease out expansion: slow at start, fast at end
      const eased = 1 - Math.pow(1 - wave.progress, 2.5);
      const scale  = 0.08 + eased * 2.0;
      const angle  = wave.sector * SECTOR_STEP;
      const radial = BASE_RADIUS;

      mesh.position.set(Math.cos(angle) * radial, Math.sin(angle) * radial, 0.2);
      mesh.scale.setScalar(scale);
      mesh.visible = true;

      // Fade: bright at birth, invisible at end
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - wave.progress) * 0.85;
      mat.color.set(wave.colorHex);
    });
  });

  return (
    <>
      {Array.from({ length: POOL_SIZE }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el; }}
          visible={false}
        >
          {/*
            ringGeometry lies in the XY plane by default.
            innerRadius=0.2 outerRadius=0.55 gives a nice ring band.
          */}
          <ringGeometry args={[0.2, 0.55, 48]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </>
  );
});

ShockwaveRings.displayName = 'ShockwaveRings';
