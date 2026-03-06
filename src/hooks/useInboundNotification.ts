import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "atendimento_sound_enabled";
const INTENSITY_KEY = "atendimento_sound_intensity";
const SOUND_URL = "/sounds/new-message.mp3";
const ORIGINAL_TITLE = document.title;

// Anti-spam: max 3 sounds per 10 seconds window
const MAX_SOUNDS_PER_WINDOW = 3;
const WINDOW_MS = 10_000;
const MIN_GAP_MS = 800; // minimum gap between sounds

export type SoundIntensity = "normal" | "discreto";

export function useInboundNotification() {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== "false";
  });
  const [intensity, setIntensity] = useState<SoundIntensity>(() => {
    return (localStorage.getItem(INTENSITY_KEY) as SoundIntensity) || "normal";
  });
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const initialLoadDoneRef = useRef(false);
  const titleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingCountRef = useRef(0);

  // Sound queue for anti-spam
  const soundTimestampsRef = useRef<number[]>([]);
  const queueRef = useRef<Array<{ contactName?: string; preview?: string }>>([]);
  const processingRef = useRef(false);
  const suppressedCountRef = useRef(0);

  // Track which conversation is currently active and if tab is focused
  const activeConvIdRef = useRef<string | null>(null);
  const tabFocusedRef = useRef(!document.hidden);

  useEffect(() => {
    const onVisChange = () => { tabFocusedRef.current = !document.hidden; };
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, []);

  // Mark initial load as done after a short delay to skip history messages
  useEffect(() => {
    const timer = setTimeout(() => {
      initialLoadDoneRef.current = true;
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Restore title when window is focused
  useEffect(() => {
    const onFocus = () => {
      pendingCountRef.current = 0;
      suppressedCountRef.current = 0;
      if (titleIntervalRef.current) {
        clearInterval(titleIntervalRef.current);
        titleIntervalRef.current = null;
      }
      document.title = ORIGINAL_TITLE;
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      if (titleIntervalRef.current) clearInterval(titleIntervalRef.current);
      document.title = ORIGINAL_TITLE;
    };
  }, []);

  const setActiveConversation = useCallback((id: string | null) => {
    activeConvIdRef.current = id;
  }, []);

  const changeIntensity = useCallback((v: SoundIntensity) => {
    setIntensity(v);
    localStorage.setItem(INTENSITY_KEY, v);
  }, []);

  const toggleSound = useCallback((on?: boolean) => {
    const next = on ?? !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem(STORAGE_KEY, String(next));

    if (next && autoplayBlocked) {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio(SOUND_URL);
        }
        audioRef.current.volume = 0;
        audioRef.current.currentTime = 0;
        audioRef.current.play().then(() => {
          audioRef.current!.pause();
          audioRef.current!.volume = 0.6;
          setAutoplayBlocked(false);
        }).catch(() => {});
      } catch {}
    }
  }, [soundEnabled, autoplayBlocked]);

  // Flash the browser tab title
  const flashTitle = useCallback((contactName?: string) => {
    pendingCountRef.current += 1;
    const count = pendingCountRef.current;

    if (titleIntervalRef.current) clearInterval(titleIntervalRef.current);

    let toggle = false;
    titleIntervalRef.current = setInterval(() => {
      toggle = !toggle;
      document.title = toggle
        ? `💬 (${count}) ${contactName || "Nova mensagem!"}`
        : ORIGINAL_TITLE;
    }, 1000);
  }, []);

  // Request browser notification permission
  const requestPermission = useCallback(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Send a native browser notification
  const sendBrowserNotification = useCallback((contactName?: string, preview?: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const notif = new Notification(contactName || "Nova mensagem", {
          body: preview || "Você recebeu uma nova mensagem no WhatsApp",
          icon: "/favicon.png",
          tag: "wa-inbound",
        } as NotificationOptions);
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
        setTimeout(() => notif.close(), 8000);
      } catch {}
    }
  }, []);

  // Play a single sound respecting anti-spam limits
  const playSingleSound = useCallback(() => {
    return new Promise<void>((resolve) => {
      const now = Date.now();
      
      // Clean old timestamps
      soundTimestampsRef.current = soundTimestampsRef.current.filter(
        (t) => now - t < WINDOW_MS
      );

      // Check if we've hit the limit
      if (soundTimestampsRef.current.length >= MAX_SOUNDS_PER_WINDOW) {
        suppressedCountRef.current += 1;
        resolve();
        return;
      }

      try {
        if (!audioRef.current) {
          audioRef.current = new Audio(SOUND_URL);
        }
        
        // Adjust volume based on intensity and focus state
        const isFocused = tabFocusedRef.current;
        const baseVolume = intensity === "discreto" ? 0.3 : 0.6;
        audioRef.current.volume = isFocused ? baseVolume * 0.5 : baseVolume;

        audioRef.current.currentTime = 0;
        audioRef.current.play().then(() => {
          soundTimestampsRef.current.push(Date.now());
          // Wait for the sound to finish or a minimum gap
          setTimeout(resolve, MIN_GAP_MS);
        }).catch(() => {
          setAutoplayBlocked(true);
          resolve();
        });
      } catch {
        setAutoplayBlocked(true);
        resolve();
      }
    });
  }, [intensity]);

  // Process the sound queue
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    while (queueRef.current.length > 0) {
      queueRef.current.shift();
      await playSingleSound();
    }

    processingRef.current = false;
  }, [playSingleSound]);

  const playNotification = useCallback((contactName?: string, preview?: string, conversationId?: string) => {
    if (!initialLoadDoneRef.current) return;

    // Always flash title regardless of sound setting
    flashTitle(contactName);

    // Always try browser notification
    sendBrowserNotification(contactName, preview);

    if (!soundEnabled) return;

    // If conversation is active and tab is focused + intensity is "discreto", skip sound
    if (
      conversationId &&
      conversationId === activeConvIdRef.current &&
      tabFocusedRef.current &&
      intensity === "discreto"
    ) {
      return;
    }

    // Add to queue and process
    queueRef.current.push({ contactName, preview });
    processQueue();
  }, [soundEnabled, flashTitle, sendBrowserNotification, intensity, processQueue]);

  return {
    soundEnabled,
    autoplayBlocked,
    intensity,
    toggleSound,
    changeIntensity,
    playNotification,
    requestPermission,
    setActiveConversation,
    markReady: () => { initialLoadDoneRef.current = true; },
  };
}
