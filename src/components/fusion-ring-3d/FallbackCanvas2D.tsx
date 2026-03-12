import { motion } from 'motion/react';
import type { FusionSignalData } from '@/src/lib/schemas/transit-state';

type FallbackCanvas2DProps = {
  signalData: FusionSignalData | null;
  resolution: number;
  error?: Error | null;
  onAudioToggle?: () => void;
  isAudioEnabled?: boolean;
  labels: {
    reducedMotionHint: string;
    resolution: string;
    audioOn: string;
    audioOff: string;
    reload: string;
    renderError: string;
  };
};

const SECTOR_COLORS = [
  '#E63946', '#C9A227', '#E9C46A', '#A8DADC', '#F4A261', '#6B9080',
  '#D4A5A5', '#9B2335', '#7B2D8E', '#2B2D42', '#00B4D8', '#48BFE3',
];

const arcPath = (radius: number, startDeg: number, endDeg: number): string => {
  const start = (startDeg * Math.PI) / 180;
  const end = (endDeg * Math.PI) / 180;

  const x1 = Math.cos(start) * radius;
  const y1 = Math.sin(start) * radius;
  const x2 = Math.cos(end) * radius;
  const y2 = Math.sin(end) * radius;

  return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
};

export const FallbackCanvas2D = ({
  signalData,
  resolution,
  error,
  onAudioToggle,
  isAudioEnabled,
  labels,
}: FallbackCanvas2DProps) => {
  const sectors = Array.from({ length: 12 }, (_, index) => {
    const signal = signalData?.targetSignals[index] ?? 0;
    const baseRadius = 80 + Math.max(0, Math.abs(signal)) * 28;
    const centerAngle = index * 30 - 90;
    return {
      index,
      signal,
      radius: baseRadius,
      start: centerAngle - 12,
      end: centerAngle + 12,
    };
  });

  return (
    <div className="relative mx-auto flex aspect-square w-full max-w-[520px] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#020509]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.12),transparent_65%)]" />

      {error ? (
        <div className="z-10 flex flex-col items-center gap-4 p-6 text-center">
          <p className="text-sm text-red-300">{labels.renderError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full border border-[#D4AF37]/50 px-4 py-2 text-xs font-semibold text-[#D4AF37] hover:bg-[#D4AF37]/10"
          >
            {labels.reload}
          </button>
        </div>
      ) : (
        <>
          <svg viewBox="-120 -120 240 240" className="z-10 h-full w-full p-5" role="img" aria-label="Fusion ring fallback view">
            <circle
              cx="0"
              cy="0"
              r="82"
              fill="none"
              stroke="#2A2A3E"
              strokeWidth="1"
              strokeDasharray="4 4"
            />

            {sectors.map((sector) => (
              <motion.path
                key={sector.index}
                d={arcPath(sector.radius, sector.start, sector.end)}
                stroke={SECTOR_COLORS[sector.index]}
                strokeWidth={5 + Math.max(0, sector.signal) * 3}
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: 0.7, opacity: 0.4 }}
                animate={{ pathLength: 1, opacity: 0.95 }}
                transition={{ duration: 0.6, delay: sector.index * 0.02 }}
              />
            ))}

            <circle cx="0" cy="0" r="26" fill="url(#sun-core)" />
            <defs>
              <radialGradient id="sun-core" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFF6D2" stopOpacity="1" />
                <stop offset="70%" stopColor="#D4AF37" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>

          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-4 py-1 text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">
            {labels.resolution}: {Math.round(resolution)}%
          </div>

          <div className="absolute left-4 top-4 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white/80">
            {labels.reducedMotionHint}
          </div>

          <div className="absolute right-4 top-4">
            <button
              type="button"
              onClick={onAudioToggle}
              className="rounded-full border border-white/20 bg-black/60 px-3 py-1 text-xs text-white hover:border-[#D4AF37]/60 hover:text-[#D4AF37]"
            >
              {isAudioEnabled ? labels.audioOn : labels.audioOff}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
