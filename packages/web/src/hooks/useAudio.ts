import { useCallback, useEffect, useRef } from 'react';

type SoundType = 'move' | 'success';

// Sound files should be placed in packages/web/public/sounds/
// If files don't exist, audio will fail gracefully
const SOUND_URLS: Record<SoundType, string> = {
  move: '/sounds/move.mp3',
  success: '/sounds/success.mp3',
};

// Fallback frequencies for generating tones when sound files are unavailable
const FALLBACK_TONES: Record<SoundType, { frequency: number; duration: number }> = {
  move: { frequency: 440, duration: 0.08 }, // A4, short click
  success: { frequency: 880, duration: 0.2 }, // A5, longer tone
};

export function useAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<Map<SoundType, AudioBuffer>>(new Map());
  const isInitializedRef = useRef(false);

  // Initialize AudioContext on first user interaction
  const initAudio = useCallback(async () => {
    if (isInitializedRef.current) return;

    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Preload sounds
      await Promise.all(
        (Object.keys(SOUND_URLS) as SoundType[]).map(async (soundType) => {
          try {
            const response = await fetch(SOUND_URLS[soundType]);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
            buffersRef.current.set(soundType, audioBuffer);
          } catch (err) {
            console.warn(`Failed to load sound: ${soundType}`, err);
          }
        })
      );

      isInitializedRef.current = true;
    } catch (err) {
      console.warn('Failed to initialize audio context', err);
    }
  }, []);

  // Initialize on mount with user interaction detection
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

  const playFallbackTone = useCallback((soundType: SoundType) => {
    if (!audioContextRef.current) return;

    try {
      const { frequency, duration } = FALLBACK_TONES[soundType];
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      // Quick fade out to avoid clicks
      gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContextRef.current.currentTime + duration
      );

      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration);
    } catch (err) {
      // Silently fail - audio is non-essential
    }
  }, []);

  const playAudio = useCallback(
    (soundType: SoundType) => {
      if (!audioContextRef.current || !isInitializedRef.current) {
        // Try to initialize if not already
        initAudio();
        return;
      }

      try {
        // Resume context if suspended (browser autoplay policy)
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }

        const buffer = buffersRef.current.get(soundType);
        if (buffer) {
          const source = audioContextRef.current.createBufferSource();
          source.buffer = buffer;
          source.connect(audioContextRef.current.destination);
          source.start(0);
        } else {
          // Use fallback tone if sound file wasn't loaded
          playFallbackTone(soundType);
        }
      } catch (err) {
        // Try fallback tone
        playFallbackTone(soundType);
      }
    },
    [initAudio, playFallbackTone]
  );

  return { playAudio };
}
