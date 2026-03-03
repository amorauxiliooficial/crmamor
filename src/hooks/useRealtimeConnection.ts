import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

export function useRealtimeConnection() {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Monitor the realtime connection via a lightweight channel
    const channel = supabase
      .channel("connection_monitor")
      .on("presence", { event: "sync" }, () => {})
      .subscribe((st) => {
        if (st === "SUBSCRIBED") {
          setStatus("connected");
        } else if (st === "CHANNEL_ERROR" || st === "TIMED_OUT") {
          setStatus("disconnected");
        } else if (st === "CLOSED") {
          setStatus("disconnected");
        }
      });

    return () => {
      supabase.removeChannel(channel);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  const reconnect = useCallback(() => {
    setStatus("connecting");
    // Force reconnect by removing and re-subscribing all channels
    // The simplest way is to reload the Supabase realtime
    window.location.reload();
  }, []);

  return { status, reconnect };
}
