import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceNoteProps {
  src: string;
  duration: number | null;
  isMe: boolean;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const BARS_COUNT = 28;

function generateBars(count: number): number[] {
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    const base = Math.sin((i / count) * Math.PI) * 0.55 + 0.3;
    const noise = Math.sin(i * 2.7 + 1.3) * 0.15 + Math.sin(i * 5.1) * 0.1;
    bars.push(Math.max(0.12, Math.min(1, base + noise)));
  }
  return bars;
}

const staticBars = generateBars(BARS_COUNT);

export const VoiceNote = memo(function VoiceNote({ src, duration, isMe }: VoiceNoteProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration ?? 0);
  const [speed, setSpeed] = useState(1);
  const animRef = useRef<number>();

  const tick = useCallback(() => {
    const a = audioRef.current;
    if (a && !a.paused) {
      const dur = a.duration || totalDuration || 1;
      setProgress(a.currentTime / dur);
      setCurrentTime(a.currentTime);
      animRef.current = requestAnimationFrame(tick);
    }
  }, [totalDuration]);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play();
      setPlaying(true);
      animRef.current = requestAnimationFrame(tick);
    } else {
      a.pause();
      setPlaying(false);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
  }, [tick]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onEnd = () => { setPlaying(false); setProgress(0); setCurrentTime(0); if (animRef.current) cancelAnimationFrame(animRef.current); };
    const onLoaded = () => { if (a.duration && isFinite(a.duration)) setTotalDuration(a.duration); };
    a.addEventListener("ended", onEnd);
    a.addEventListener("loadedmetadata", onLoaded);
    return () => { a.removeEventListener("ended", onEnd); a.removeEventListener("loadedmetadata", onLoaded); if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const toggleSpeed = useCallback(() => {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }, [speed]);

  const handleBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const dur = a.duration || totalDuration || 1;
    a.currentTime = ratio * dur;
    setProgress(ratio);
    setCurrentTime(a.currentTime);
  }, [totalDuration]);

  const displayTime = playing ? currentTime : (totalDuration || 0);

  return (
    <div className="flex items-center gap-2 min-w-0 w-full max-w-[300px] py-0.5 px-1">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
          isMe
            ? "bg-white/20 hover:bg-white/30 text-white"
            : "bg-muted-foreground/10 hover:bg-muted-foreground/15 text-foreground/60"
        )}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
      </button>

      {/* Waveform bars — WhatsApp style */}
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        <div
          className="flex items-center gap-[1.5px] h-[26px] cursor-pointer"
          onClick={handleBarClick}
        >
          {/* Dot indicator */}
          <div className={cn(
            "h-2 w-2 rounded-full shrink-0 mr-0.5",
            isMe
              ? (playing ? "bg-white animate-pulse" : "bg-white/60")
              : (playing ? "bg-primary animate-pulse" : "bg-primary/60")
          )} />

          {staticBars.map((h, i) => {
            const active = i / BARS_COUNT <= progress;
            return (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-full min-w-[1.5px] max-w-[3px] transition-colors duration-75",
                  isMe
                    ? (active ? "bg-white" : "bg-white/30")
                    : (active ? "bg-primary" : "bg-muted-foreground/20")
                )}
                style={{ height: `${h * 100}%` }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between px-0.5">
          <span className={cn(
            "text-[10px] font-mono tabular-nums",
            isMe ? "text-white/70" : "text-muted-foreground/50"
          )}>
            {formatTime(displayTime)}
          </span>
          <button
            onClick={toggleSpeed}
            className={cn(
              "text-[9px] font-bold tabular-nums px-1 py-0.5 rounded transition-colors",
              isMe
                ? "text-white/60 hover:bg-white/10"
                : "text-muted-foreground/40 hover:bg-muted/30"
            )}
          >
            {speed}x
          </button>
        </div>
      </div>

      {/* Mic icon */}
      <div className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
        isMe ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
      )}>
        <Mic className="h-3.5 w-3.5" />
      </div>
    </div>
  );
});
