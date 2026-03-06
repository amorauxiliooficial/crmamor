import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Headphones } from "lucide-react";
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

export const VoiceNote = memo(function VoiceNote({ src, duration, isMe }: VoiceNoteProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration ?? 0);
  const [speed, setSpeed] = useState(1);
  const [dragging, setDragging] = useState(false);
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
      if (a.duration && isFinite(a.duration)) setTotalDuration(a.duration);
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

  const seekTo = useCallback((ratio: number) => {
    const a = audioRef.current;
    if (!a) return;
    const clamped = Math.max(0, Math.min(1, ratio));
    const dur = a.duration || totalDuration || 1;
    a.currentTime = clamped * dur;
    setProgress(clamped);
    setCurrentTime(a.currentTime);
  }, [totalDuration]);

  const handleSliderClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seekTo((e.clientX - rect.left) / rect.width);
  }, [seekTo]);

  // Drag support
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = sliderRef.current?.getBoundingClientRect();
    if (rect) seekTo((e.clientX - rect.left) / rect.width);
  }, [seekTo]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const rect = sliderRef.current?.getBoundingClientRect();
    if (rect) seekTo((e.clientX - rect.left) / rect.width);
  }, [dragging, seekTo]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const displayTime = playing ? currentTime : (totalDuration || 0);

  return (
    <div className="flex items-center gap-2.5 min-w-0 w-full max-w-[280px] py-1 px-1">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause — WhatsApp circle */}
      <button
        onClick={togglePlay}
        className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-colors",
          isMe
            ? "bg-foreground/10 hover:bg-foreground/15 text-foreground/70"
            : "bg-muted-foreground/10 hover:bg-muted-foreground/15 text-muted-foreground/70"
        )}
      >
        {playing
          ? <Pause className="h-4 w-4" />
          : <Play className="h-4 w-4 ml-0.5" />
        }
      </button>

      {/* Slider track + time */}
      <div className="flex-1 flex flex-col gap-0.5 min-w-0">
        {/* Track */}
        <div
          ref={sliderRef}
          className="relative h-5 flex items-center cursor-pointer touch-none"
          onClick={handleSliderClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Background track */}
          <div className={cn(
            "absolute inset-x-0 h-[3px] rounded-full",
            isMe ? "bg-foreground/12" : "bg-muted-foreground/15"
          )} />
          {/* Filled track */}
          <div
            className="absolute left-0 h-[3px] rounded-full bg-primary transition-[width] duration-75"
            style={{ width: `${progress * 100}%` }}
          />
          {/* Thumb */}
          <div
            className={cn(
              "absolute h-3 w-3 rounded-full bg-primary shadow-sm -translate-x-1/2 transition-[left] duration-75",
              dragging && "h-3.5 w-3.5 shadow-md"
            )}
            style={{ left: `${progress * 100}%` }}
          />
        </div>

        {/* Time + speed */}
        <div className="flex items-center justify-between px-0.5">
          <span className={cn(
            "text-[10px] font-mono tabular-nums",
            isMe ? "text-foreground/40" : "text-muted-foreground/45"
          )}>
            {formatTime(displayTime)}
          </span>
          {speed !== 1 && (
            <button
              onClick={toggleSpeed}
              className={cn(
                "text-[9px] font-bold px-1 py-0.5 rounded transition-colors",
                isMe ? "text-foreground/40 hover:bg-foreground/5" : "text-muted-foreground/40 hover:bg-muted/30"
              )}
            >
              {speed}x
            </button>
          )}
        </div>
      </div>

      {/* Headphones icon — WhatsApp style */}
      <button
        onClick={toggleSpeed}
        className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-colors",
          "bg-primary hover:bg-primary/90 text-primary-foreground"
        )}
        title={`Velocidade: ${speed}x`}
      >
        <Headphones className="h-4 w-4" />
      </button>
    </div>
  );
});
