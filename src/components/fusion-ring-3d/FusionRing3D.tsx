import {
  Component,
  type ErrorInfo,
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useReducedMotion } from 'motion/react';

import { RingMesh } from './RingMesh';
import { DivergenceSpikes } from './DivergenceSpikes';
import { EnergyParticles } from './EnergyParticles';
import { EquilibriumLine } from './EquilibriumLine';
import { RingOverlays } from './RingOverlays';
import { FallbackCanvas2D } from './FallbackCanvas2D';

import { useFusionSignal } from '@/src/hooks/useFusionSignal';
import { useSpaceWeather } from '@/src/hooks/useSpaceWeather';
import { useRingAudio } from '@/src/hooks/useRingAudio';

export type FusionRing3DLabels = {
  regionLabel: string;
  loading: string;
  reducedMotionHint: string;
  resolution: string;
  audioOn: string;
  audioOff: string;
  latestEvents: string;
  renderError: string;
  reload: string;
  eventAnnouncePrefix: string;
};

type FusionRing3DProps = {
  userId: string;
  isInteractive?: boolean;
  onSpikeClick?: (sector: number) => void;
  labels: FusionRing3DLabels;
};

type BoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
  onError?: () => void;
};

type BoundaryState = {
  hasError: boolean;
};

class CanvasBoundary extends Component<BoundaryProps, BoundaryState> {
  public state: BoundaryState = { hasError: false };

  public static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    this.props.onError?.();
  }

  public render(): ReactNode {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

const isWebGLSupported = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
};

type PerformanceGuardProps = {
  onLowPerformance: () => void;
};

const PerformanceGuard = ({ onLowPerformance }: PerformanceGuardProps) => {
  const slowFramesRef = useRef<number>(0);
  const triggeredRef = useRef<boolean>(false);

  useFrame((_, delta) => {
    if (triggeredRef.current) return;
    if (delta > 0.05) {
      slowFramesRef.current += 1;
    }
    if (slowFramesRef.current > 35) {
      triggeredRef.current = true;
      onLowPerformance();
    }
  });

  return null;
};

export const FusionRing3D = ({
  userId,
  isInteractive = true,
  onSpikeClick,
  labels,
}: FusionRing3DProps) => {
  const prefersReducedMotion = useReducedMotion();

  const [isLowEndDevice, setIsLowEndDevice] = useState<boolean>(false);
  const [forceFallback, setForceFallback] = useState<boolean>(false);

  const { signalData, events, resolution, loading, error } = useFusionSignal(userId);
  const { kpIndex } = useSpaceWeather();

  const { playSpikeChime, toggleMute, isMuted } = useRingAudio(signalData);

  const shouldFallback = !!prefersReducedMotion || isLowEndDevice || forceFallback || !!error;

  useEffect(() => {
    const lowEndByCores = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
    const lowEndByMemory =
      typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === 'number' &&
      ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;

    setIsLowEndDevice(lowEndByCores || lowEndByMemory || !isWebGLSupported());
  }, []);

  const handleSpikeEruption = useCallback(
    (sector: number) => {
      if (!isMuted) {
        playSpikeChime(sector);
      }
      onSpikeClick?.(sector);
    },
    [isMuted, onSpikeClick, playSpikeChime],
  );

  const liveRegionText = useMemo(() => {
    return events
      .slice(-3)
      .map((event) => {
        const roundedDelta = Math.round(event.delta * 100);
        return `${labels.eventAnnouncePrefix} S${event.sector}: ${event.trigger_symbol || '✦'} ${event.trigger_planet || ''} ${event.sector_domain || event.type} (${roundedDelta}%)`;
      })
      .join('. ');
  }, [events, labels.eventAnnouncePrefix]);

  if (loading && !signalData) {
    return (
      <div className="mx-auto flex aspect-square w-full max-w-[560px] items-center justify-center rounded-3xl border border-white/10 bg-[#020509] text-sm text-white/70">
        {labels.loading}
      </div>
    );
  }

  if (!signalData || shouldFallback) {
    return (
      <FallbackCanvas2D
        signalData={signalData}
        resolution={resolution}
        error={error}
        onAudioToggle={toggleMute}
        isAudioEnabled={!isMuted}
        labels={{
          reducedMotionHint: labels.reducedMotionHint,
          resolution: labels.resolution,
          audioOn: labels.audioOn,
          audioOff: labels.audioOff,
          reload: labels.reload,
          renderError: labels.renderError,
        }}
      />
    );
  }

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[760px] overflow-hidden rounded-3xl border border-white/10 bg-[#020509]"
      role="region"
      aria-label={labels.regionLabel}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key.toLowerCase() === 'm') {
          toggleMute();
        }
      }}
    >
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveRegionText}
      </div>

      <CanvasBoundary
        fallback={
          <FallbackCanvas2D
            signalData={signalData}
            resolution={resolution}
            error={new Error(labels.renderError)}
            onAudioToggle={toggleMute}
            isAudioEnabled={!isMuted}
            labels={{
              reducedMotionHint: labels.reducedMotionHint,
              resolution: labels.resolution,
              audioOn: labels.audioOn,
              audioOff: labels.audioOff,
              reload: labels.reload,
              renderError: labels.renderError,
            }}
          />
        }
        onError={() => setForceFallback(true)}
      >
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 9], fov: 45 }}
          gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }}
        >
          <Suspense fallback={null}>
            <PerformanceGuard onLowPerformance={() => setForceFallback(true)} />

            <color attach="background" args={['#020509']} />
            <ambientLight intensity={0.5} />
            <pointLight position={[4, 6, 6]} intensity={0.9} color="#9ed7ff" />
            <pointLight position={[-6, -4, 4]} intensity={0.45} color="#ffc76d" />

            <RingMesh
              signalData={signalData}
              kpIndex={kpIndex}
              reducedMotion={!!prefersReducedMotion}
              pulseSeed={events.length}
            />

            <EquilibriumLine thirtyDayAvg={signalData.thirtyDayAvg} />
            <EnergyParticles transitIntensity={signalData.transitIntensity} reducedMotion={!!prefersReducedMotion} />

            <DivergenceSpikes events={events} onSpikeEruption={handleSpikeEruption} />

            <RingOverlays
              events={events}
              resolution={resolution}
              isAudioEnabled={!isMuted}
              onAudioToggle={toggleMute}
              labels={{
                resolution: labels.resolution,
                audioOn: labels.audioOn,
                audioOff: labels.audioOff,
                latestEvents: labels.latestEvents,
              }}
            />

            <OrbitControls
              enabled={isInteractive}
              enablePan={false}
              enableZoom={false}
              minPolarAngle={Math.PI / 2.3}
              maxPolarAngle={Math.PI / 1.75}
              rotateSpeed={0.35}
            />
          </Suspense>
        </Canvas>
      </CanvasBoundary>
    </div>
  );
};
