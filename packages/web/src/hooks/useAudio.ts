import { useCallback, useEffect, useRef } from 'react';

type SoundType = 'move' | 'success';

// Synthesised feedback tones. The old implementation fetched
// /sounds/move.mp3 + /sounds/success.mp3, but those files never existed in
// production — every board interaction paid two failed fetches and console
// noise before landing on this oscillator path anyway. The tones are now the
// one and only implementation.
const TONES: Record<SoundType, { frequency: number; duration: number }> = {
  move: { frequency: 440, duration: 0.08 }, // A4, short click
  success: { frequency: 880, duration: 0.2 }, // A5, longer tone
};

export function useAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize AudioContext on first user interaction (autoplay policy)
  const initAudio = useCallback(() => {
    if (audioContextRef.current) return;

    try {
      const WebkitAudioContext = (
        window as Window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
      const AudioContextCtor = window.AudioContext ?? WebkitAudioContext;

      if (!AudioContextCtor) return;

      audioContextRef.current = new AudioContextCtor();
    } catch {
      // Silently fail - audio is non-essential
    }
  }, []);

  useEffect(() => {
    const handleInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [initAudio]);

  const playAudio = useCallback(
    (soundType: SoundType) => {
      if (!audioContextRef.current) {
        initAudio();
        if (!audioContextRef.current) return;
      }
      const ctx = audioContextRef.current;

      try {
        // Resume context if suspended (browser autoplay policy)
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        const { frequency, duration } = TONES[soundType];
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';

        // Quick fade out to avoid clicks
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
      } catch {
        // Silently fail - audio is non-essential
      }
    },
    [initAudio]
  );

  return { playAudio };
}
