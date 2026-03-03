import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "atendimento_sound_enabled";
const THROTTLE_MS = 2000; // max 1 sound every 2 seconds
const SOUND_URL = "/sounds/new-message.mp3";

export function useInboundNotification() {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== "false"; // default on
  });
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedRef = useRef(0);
  const initialLoadDoneRef = useRef(false);

  // Mark initial load as done after a short delay to skip history messages
  useEffect(() => {
    const timer = setTimeout(() => {
      initialLoadDoneRef.current = true;
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const toggleSound = useCallback((on?: boolean) => {
    const next = on ?? !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem(STORAGE_KEY, String(next));

    // If enabling, try to play silently to unlock autoplay
    if (next && autoplayBlocked) {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio(SOUND_URL);
          audioRef.current.volume = 0.3;
        }
        audioRef.current.currentTime = 0;
        audioRef.current.volume = 0;
        audioRef.current.play().then(() => {
          audioRef.current!.pause();
          audioRef.current!.volume = 0.3;
          setAutoplayBlocked(false);
        }).catch(() => {});
      } catch {}
    }
  }, [soundEnabled, autoplayBlocked]);

  const playNotification = useCallback(() => {
    if (!soundEnabled) return;
    if (!initialLoadDoneRef.current) return;

    const now = Date.now();
    if (now - lastPlayedRef.current < THROTTLE_MS) return;

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(SOUND_URL);
        audioRef.current.volume = 0.3;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => {
        lastPlayedRef.current = Date.now();
      }).catch(() => {
        setAutoplayBlocked(true);
      });
    } catch {
      setAutoplayBlocked(true);
    }
  }, [soundEnabled]);

  return {
    soundEnabled,
    autoplayBlocked,
    toggleSound,
    playNotification,
    /** Call this to mark initial load as complete (e.g. after first query finishes) */
    markReady: () => { initialLoadDoneRef.current = true; },
  };
}
