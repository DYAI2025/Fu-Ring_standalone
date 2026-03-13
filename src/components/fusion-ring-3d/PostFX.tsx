import { useMemo } from 'react';
import * as THREE from 'three';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

/**
 * Post-processing stack for the Fu-Ring.
 *
 * - Bloom: subtle light bleed — kept low so tube structure stays visible
 * - ChromaticAberration: splits colour channels at grazing angles → plasma feel
 * - Vignette: deepens the cosmic void around the ring
 */
export const PostFX = () => {
  const chromaOffset = useMemo(() => new THREE.Vector2(0.0004, 0.0004), []);

  return (
    <EffectComposer>
      <Bloom
        luminanceThreshold={0.28}
        luminanceSmoothing={0.35}
        intensity={0.85}
        mipmapBlur
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={chromaOffset}
        radialModulation={false}
        modulationOffset={0}
      />
      <Vignette
        darkness={0.55}
        offset={0.35}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
};
