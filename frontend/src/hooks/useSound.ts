import { useState, useEffect, useCallback, useRef } from 'react';
import { soundUrls, type SoundType } from '../config/sounds';

const SOUND_ENABLED_KEY = 'chess_sound_enabled';
const SOUND_VOLUME_KEY = 'chess_sound_volume';

interface SoundCache {
  [key: string]: HTMLAudioElement;
}

export const useSound = () => {
  const [enabled, setEnabled] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const soundCache = useRef<SoundCache>({});

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedEnabled = localStorage.getItem(SOUND_ENABLED_KEY);
    const savedVolume = localStorage.getItem(SOUND_VOLUME_KEY);

    if (savedEnabled !== null) {
      setEnabled(savedEnabled === 'true');
    }

    if (savedVolume !== null) {
      setVolume(parseFloat(savedVolume));
    }
  }, []);

  // Preload sounds
  useEffect(() => {
    Object.entries(soundUrls).forEach(([key, url]) => {
      if (!soundCache.current[key]) {
        const audio = new Audio(url);
        audio.preload = 'auto';
        audio.volume = volume;
        soundCache.current[key] = audio;
      }
    });
  }, [volume]);

  // Update volume for all cached sounds
  useEffect(() => {
    Object.values(soundCache.current).forEach((audio) => {
      audio.volume = volume;
    });
  }, [volume]);

  const playSound = useCallback(
    (soundType: SoundType) => {
      if (!enabled) return;

      try {
        const audio = soundCache.current[soundType];
        if (audio) {
          // Clone the audio to allow overlapping sounds
          const sound = audio.cloneNode() as HTMLAudioElement;
          sound.volume = volume;
          sound.play().catch((err) => {
            console.warn('Failed to play sound:', err);
          });
        }
      } catch (err) {
        console.warn('Error playing sound:', err);
      }
    },
    [enabled, volume]
  );

  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem(SOUND_ENABLED_KEY, String(newValue));
      return newValue;
    });
  }, []);

  const updateVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    localStorage.setItem(SOUND_VOLUME_KEY, String(clampedVolume));
  }, []);

  return {
    enabled,
    volume,
    playSound,
    toggleEnabled,
    updateVolume,
  };
};
