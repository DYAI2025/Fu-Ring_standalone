import { useCallback, useEffect, useState } from 'react';
import {
  FusionSignalDataSchema,
  TransitEvent,
  TransitStateSchema,
  type FusionSignalData,
} from '@/src/lib/schemas/transit-state';
import {
  applyGaussSpread,
  applyPowerCurve,
  calculateFusionSignal,
  clamp01,
} from '@/src/utils/math';

type FusionSignalState = {
  signalData: FusionSignalData | null;
  events: TransitEvent[];
  resolution: number;
  loading: boolean;
  error: Error | null;
  updateResolution: (nextResolution: number) => void;
};

const clampTarget = (value: number): number => Math.max(-1, Math.min(2, value));

export const useFusionSignal = (userId: string): FusionSignalState => {
  const [signalData, setSignalData] = useState<FusionSignalData | null>(null);
  const [events, setEvents] = useState<TransitEvent[]>([]);
  const [resolution, setResolution] = useState<number>(33);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTransitState = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/transit-state/${encodeURIComponent(userId)}`, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Transit state fetch failed (${response.status})`);
      }

      const payload = await response.json();
      const parsed = TransitStateSchema.safeParse(payload);

      if (!parsed.success) {
        throw new Error(parsed.error.message);
      }

      const transitState = parsed.data;

      const baseSignals = transitState.soulprint.sectors.map(clamp01);
      const thirtyDayAvg = transitState.delta.vs_30day_avg.avg_sectors.map(clamp01);
      const transitIntensity = clamp01(transitState.transit_contribution.transit_intensity);

      const rawTargets = transitState.ring.sectors.map((ringSector, index) =>
        calculateFusionSignal(
          clamp01(ringSector),
          baseSignals[index] ?? 0,
          thirtyDayAvg[index] ?? 0,
          transitIntensity,
        ),
      );

      const spreadTargets = applyGaussSpread(rawTargets);
      const targetSignals = spreadTargets.map((value) =>
        clampTarget(applyPowerCurve(value)),
      );

      const nextSignalData = FusionSignalDataSchema.parse({
        targetSignals,
        baseSignals,
        thirtyDayAvg,
        transitIntensity,
      });

      setSignalData(nextSignalData);
      setEvents(transitState.events);
      setResolution(
        transitState.resolution != null
          ? Math.max(0, Math.min(100, transitState.resolution))
          : 33,
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown transit-state error'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchTransitState();
    const interval = window.setInterval(() => {
      void fetchTransitState();
    }, 800);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchTransitState]);

  const updateResolution = useCallback((nextResolution: number) => {
    setResolution(Math.max(33, Math.min(100, nextResolution)));
  }, []);

  return {
    signalData,
    events,
    resolution,
    loading,
    error,
    updateResolution,
  };
};
