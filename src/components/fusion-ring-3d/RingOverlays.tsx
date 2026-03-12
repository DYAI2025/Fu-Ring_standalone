import { Html } from '@react-three/drei';
import type { TransitEvent } from '@/src/lib/schemas/transit-state';

type RingOverlaysProps = {
  events: TransitEvent[];
  resolution: number;
  isAudioEnabled: boolean;
  onAudioToggle: () => void;
  labels: {
    resolution: string;
    audioOn: string;
    audioOff: string;
    latestEvents: string;
  };
};

export const RingOverlays = ({
  events,
  resolution,
  isAudioEnabled,
  onAudioToggle,
  labels,
}: RingOverlaysProps) => {
  const latest = events.slice(-3).reverse();

  return (
    <Html fullscreen>
      <div className="pointer-events-none relative h-full w-full">
        <div className="pointer-events-auto absolute right-4 top-4 flex items-center gap-2">
          <button
            type="button"
            onClick={onAudioToggle}
            className="rounded-full border border-white/20 bg-black/60 px-3 py-1 text-xs font-medium text-white transition hover:border-[#D4AF37]/60 hover:text-[#D4AF37]"
            aria-label={isAudioEnabled ? labels.audioOn : labels.audioOff}
          >
            {isAudioEnabled ? labels.audioOn : labels.audioOff}
          </button>
        </div>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-4 py-1 text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">
          {labels.resolution}: {Math.round(resolution)}%
        </div>

        {latest.length > 0 ? (
          <div className="absolute bottom-12 left-4 max-w-[min(90vw,24rem)] rounded-xl border border-white/10 bg-black/65 p-3 text-[11px] text-white/80 shadow-xl">
            <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/55">
              {labels.latestEvents}
            </div>
            <ul className="space-y-1">
              {latest.map((event) => (
                <li key={event.id}>
                  {event.trigger_symbol || '✦'} S{event.sector} • {event.sector_domain || event.type}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Html>
  );
};
