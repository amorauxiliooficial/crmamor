import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "atendimento_sound_enabled";
const THROTTLE_MS = 2000;
const SOUND_URL = "/sounds/new-message.mp3";
const ORIGINAL_TITLE = document.title;

export function useInboundNotification() {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== "false";
  });
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedRef = useRef(0);
  const initialLoadDoneRef = useRef(false);
  const titleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingCountRef = useRef(0);

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

  const toggleSound = useCallback((on?: boolean) => {
    const next = on ?? !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem(STORAGE_KEY, String(next));

    if (next && autoplayBlocked) {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio(SOUND_URL);
          audioRef.current.volume = 0.6;
        }
        audioRef.current.currentTime = 0;
        audioRef.current.volume = 0;
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
          renotify: true,
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
        // Auto close after 8 seconds
        setTimeout(() => notif.close(), 8000);
      } catch {}
    }
  }, []);

  const playNotification = useCallback((contactName?: string, preview?: string) => {
    if (!initialLoadDoneRef.current) return;

    // Always flash title regardless of sound setting
    flashTitle(contactName);

    // Always try browser notification
    sendBrowserNotification(contactName, preview);

    if (!soundEnabled) return;

    const now = Date.now();
    if (now - lastPlayedRef.current < THROTTLE_MS) return;

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(SOUND_URL);
        audioRef.current.volume = 0.6;
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
  }, [soundEnabled, flashTitle, sendBrowserNotification]);

  return {
    soundEnabled,
    autoplayBlocked,
    toggleSound,
    playNotification,
    requestPermission,
    markReady: () => { initialLoadDoneRef.current = true; },
  };
}
