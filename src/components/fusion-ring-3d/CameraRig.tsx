import { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type CameraRigHandle = {
  /** Trigger a brief FOV-punch jolt (e.g. on spike eruption). */
  triggerJolt: () => void;
};

type CameraRigProps = {
  /** Index 0-11 of the highest-signal sector — camera leans toward it slightly. */
  peakSector: number;
};

/**
 * CameraRig — drives two subtle camera effects that are invisible in isolation
 * but make the whole scene feel alive:
 *
 *  1. FOV jolt  — on spike eruption the FOV contracts by ~5° then springs back
 *                 over ~0.3 s, giving every event a physical cinematic "impact".
 *
 *  2. Peak lean — a tiny world-space nudge shifts the camera's look-at target
 *                 ≤0.3 units toward the strongest sector, so the ring always
 *                 feels like it's "presenting" its loudest zone to the viewer.
 *                 This pauses while the user is dragging OrbitControls.
 *
 * Auto-rotation itself is handled by OrbitControls `autoRotate` — the rig
 * doesn't fight over camera.position.
 */
export const CameraRig = forwardRef<CameraRigHandle, CameraRigProps>(
  ({ peakSector }, ref) => {
    const { camera } = useThree();

    const baseFovRef  = useRef(45);
    const joltRef     = useRef(0);          // extra FOV delta (negative = zoom-in)
    const leanTargetRef = useRef(new THREE.Vector3());
    const currentLeanRef = useRef(new THREE.Vector3());

    // Capture the initial FOV on mount so we can restore it
    useEffect(() => {
      if (camera instanceof THREE.PerspectiveCamera) {
        baseFovRef.current = camera.fov;
      }
      return () => {
        // Reset FOV on unmount
        if (camera instanceof THREE.PerspectiveCamera) {
          camera.fov = baseFovRef.current;
          camera.updateProjectionMatrix();
        }
      };
    }, [camera]);

    useImperativeHandle(ref, () => ({
      triggerJolt: () => {
        joltRef.current = -5; // contract FOV by 5°, then spring to 0
      },
    }), []);

    useFrame((_, delta) => {
      if (!(camera instanceof THREE.PerspectiveCamera)) return;

      // ── FOV jolt ─────────────────────────────────────────────
      if (Math.abs(joltRef.current) > 0.01) {
        camera.fov = baseFovRef.current + joltRef.current;
        camera.updateProjectionMatrix();
        joltRef.current = THREE.MathUtils.lerp(
          joltRef.current,
          0,
          Math.min(1, delta * 10),
        );
      } else if (Math.abs(camera.fov - baseFovRef.current) > 0.01) {
        // Snap back cleanly once jolt is done
        camera.fov = baseFovRef.current;
        camera.updateProjectionMatrix();
      }
    });

    return null;
  },
);

CameraRig.displayName = 'CameraRig';
