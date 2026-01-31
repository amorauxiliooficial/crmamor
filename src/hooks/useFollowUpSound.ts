import { useCallback, useRef } from "react";

const ALERT_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export function useFollowUpSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedRef = useRef<number>(0);
  const MIN_INTERVAL = 30000; // 30 seconds minimum between sounds

  const playSound = useCallback(() => {
    const now = Date.now();
    
    // Prevent playing too frequently
    if (now - lastPlayedRef.current < MIN_INTERVAL) {
      return;
    }

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(ALERT_SOUND_URL);
        audioRef.current.volume = 0.5;
      }
      
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((e) => {
        // Silently fail if autoplay is blocked
        console.log("Audio autoplay blocked:", e);
      });
      
      lastPlayedRef.current = now;
    } catch (e) {
      console.error("Error playing sound:", e);
    }
  }, []);

  return { playSound };
}
