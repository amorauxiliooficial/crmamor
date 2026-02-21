import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Download, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

// Generate a deterministic fake waveform from duration
function generateBars(count: number): number[] {
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    // Create a wave-like pattern
    const base = Math.sin((i / count) * Math.PI) * 0.6 + 0.3;
    const noise = Math.sin(i * 2.7 + 1.3) * 0.15 + Math.sin(i * 5.1) * 0.1;
    bars.push(Math.max(0.15, Math.min(1, base + noise)));
  }
  return bars;
}

const BARS_COUNT = 32;
const bars = generateBars(BARS_COUNT);

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

    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    const onLoaded = () => {
      if (a.duration && isFinite(a.duration)) {
        setTotalDuration(a.duration);
      }
    };
    a.addEventListener("ended", onEnd);
    a.addEventListener("loadedmetadata", onLoaded);
    return () => {
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("loadedmetadata", onLoaded);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
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
    const ratio = (e.clientX - rect.left) / rect.width;
    const dur = a.duration || totalDuration || 1;
    a.currentTime = ratio * dur;
    setProgress(ratio);
    setCurrentTime(a.currentTime);
  }, [totalDuration]);

  const displayTime = playing ? currentTime : (totalDuration || 0);

  return (
    <div className={cn(
      "flex items-center gap-2 min-w-[220px] max-w-[320px] py-1",
    )}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause button */}
      <button
        onClick={togglePlay}
        className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
          isMe
            ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground"
            : "bg-primary/10 hover:bg-primary/20 text-primary"
        )}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
      </button>

      {/* Waveform */}
      <div className="flex-1 flex flex-col gap-1">
        <div
          className="flex items-end gap-[2px] h-6 cursor-pointer"
          onClick={handleBarClick}
        >
          {bars.map((h, i) => {
            const active = i / BARS_COUNT <= progress;
            return (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-full min-w-[2px] transition-colors duration-100",
                  active
                    ? isMe ? "bg-primary-foreground/80" : "bg-primary/70"
                    : isMe ? "bg-primary-foreground/25" : "bg-muted-foreground/20"
                )}
                style={{ height: `${h * 100}%` }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-[10px] font-mono tabular-nums",
            isMe ? "text-primary-foreground/60" : "text-muted-foreground/50"
          )}>
            {formatTime(displayTime)}
          </span>
          <button
            onClick={toggleSpeed}
            className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-md transition-colors",
              isMe
                ? "text-primary-foreground/60 hover:bg-primary-foreground/10"
                : "text-muted-foreground/50 hover:bg-muted/30"
            )}
          >
            {speed}x
          </button>
        </div>
      </div>

      {/* More menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={cn(
            "h-7 w-7 rounded-md flex items-center justify-center shrink-0 transition-colors",
            isMe ? "text-primary-foreground/40 hover:text-primary-foreground/70" : "text-muted-foreground/30 hover:text-muted-foreground/60"
          )}>
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem asChild>
            <a href={src} download target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <Download className="h-3.5 w-3.5" /> Baixar
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
