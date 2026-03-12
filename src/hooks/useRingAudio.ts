import { useCallback, useEffect, useRef, useState } from 'react';
import type { FusionSignalData } from '@/src/lib/schemas/transit-state';

export interface RingAudioControls {
  playSpikeChime: (sector: number) => void;
  updateHumVolume: (intensity: number) => void;
  toggleMute: () => void;
  isMuted: boolean;
}

const SECTOR_PITCHES = [
  261.63, 293.66, 329.63, 349.23, 392.0, 440.0,
  493.88, 523.25, 587.33, 659.25, 739.99, 880.0,
];

export const useRingAudio = (signalData: FusionSignalData | null): RingAudioControls => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const humOscRef = useRef<OscillatorNode | null>(null);
  const humGainRef = useRef<GainNode | null>(null);
  const lowPassRef = useRef<BiquadFilterNode | null>(null);
  const isInitializedRef = useRef<boolean>(false);

  const [isMuted, setIsMuted] = useState<boolean>(false);

  const initAudio = useCallback(async () => {
    if (isInitializedRef.current || isMuted) return;

    const AudioCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    const context = new AudioCtor();
    const humOsc = context.createOscillator();
    const lowPass = context.createBiquadFilter();
    const humGain = context.createGain();

    humOsc.type = 'sine';
    humOsc.frequency.value = 63;

    lowPass.type = 'lowpass';
    lowPass.frequency.value = 420;

    humGain.gain.value = 0;

    humOsc.connect(lowPass);
    lowPass.connect(humGain);
    humGain.connect(context.destination);

    humOsc.start();

    audioContextRef.current = context;
    humOscRef.current = humOsc;
    humGainRef.current = humGain;
    lowPassRef.current = lowPass;
    isInitializedRef.current = true;

    humGain.gain.setTargetAtTime(0.15, context.currentTime, 0.15);
  }, [isMuted]);

  const playSpikeChime = useCallback((sector: number) => {
    if (isMuted) return;

    const context = audioContextRef.current;
    if (!context) return;

    if (context.state === 'suspended') {
      void context.resume();
    }

    const pitch = SECTOR_PITCHES[Math.max(0, Math.min(11, sector))] ?? 440;
    const osc = context.createOscillator();
    const gain = context.createGain();

    osc.type = 'triangle';
    osc.frequency.value = pitch;

    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(context.destination);

    osc.start();
    osc.stop(context.currentTime + 0.6);
  }, [isMuted]);

  const updateHumVolume = useCallback((intensity: number) => {
    const context = audioContextRef.current;
    const gain = humGainRef.current;
    if (!context || !gain || isMuted) return;

    const targetGain = 0.08 + Math.max(0, Math.min(1, intensity)) * 0.32;
    gain.gain.setTargetAtTime(targetGain, context.currentTime, 0.12);

    if (lowPassRef.current) {
      const targetCutoff = 260 + Math.max(0, Math.min(1, intensity)) * 800;
      lowPassRef.current.frequency.setTargetAtTime(targetCutoff, context.currentTime, 0.15);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      const context = audioContextRef.current;
      const gain = humGainRef.current;

      if (context && gain) {
        if (next) {
          gain.gain.setTargetAtTime(0, context.currentTime, 0.08);
          if (context.state === 'running') {
            void context.suspend();
          }
        } else {
          if (!isInitializedRef.current) {
            void initAudio();
          }
          if (context.state === 'suspended') {
            void context.resume();
          }
          gain.gain.setTargetAtTime(0.15, context.currentTime, 0.1);
        }
      }

      return next;
    });
  }, [initAudio]);

  useEffect(() => {
    const handleUserGesture = () => {
      if (!isInitializedRef.current && !isMuted) {
        void initAudio();
      }
      window.removeEventListener('click', handleUserGesture);
      window.removeEventListener('touchstart', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
    };

    window.addEventListener('click', handleUserGesture, { passive: true });
    window.addEventListener('touchstart', handleUserGesture, { passive: true });
    window.addEventListener('keydown', handleUserGesture);

    return () => {
      window.removeEventListener('click', handleUserGesture);
      window.removeEventListener('touchstart', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
    };
  }, [initAudio, isMuted]);

  useEffect(() => {
    if (signalData?.transitIntensity != null) {
      updateHumVolume(signalData.transitIntensity);
    }
  }, [signalData, updateHumVolume]);

  useEffect(() => {
    return () => {
      if (humOscRef.current) {
        try {
          humOscRef.current.stop();
        } catch {
          // noop
        }
        humOscRef.current.disconnect();
      }
      if (humGainRef.current) {
        humGainRef.current.disconnect();
      }
      if (lowPassRef.current) {
        lowPassRef.current.disconnect();
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, []);

  return {
    playSpikeChime,
    updateHumVolume,
    toggleMute,
    isMuted,
  };
};
