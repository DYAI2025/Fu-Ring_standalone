import { useMemo } from 'react';
import * as THREE from 'three';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

/**
 * Post-processing stack for the Fu-Ring.
 *
 * - Bloom: makes the ring surface bleed light into surrounding space
 * - ChromaticAberration: splits colour channels at grazing angles → plasma feel
 * - Vignette: deepens the cosmic void around the ring
 */
export const PostFX = () => {
  const chromaOffset = useMemo(() => new THREE.Vector2(0.0005, 0.0005), []);

  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.15}
        luminanceSmoothing={0.4}
        intensity={1.8}
        mipmapBlur
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={chromaOffset}
        radialModulation={false}
        modulationOffset={0}
      />
      <Vignette
        darkness={0.6}
        offset={0.35}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
};
