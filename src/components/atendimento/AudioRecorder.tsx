import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Mic, Trash2, Play, Pause, Send, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { remuxWebmToOgg } from "@/lib/webmToOgg";

interface AudioRecorderProps {
  onSendAudio: (file: File) => void;
  disabled?: boolean;
}

function formatRecordTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const WAVE_BARS = 28;

/* ── Static waveform for preview (from recorded audio) ─────────── */
function StaticWaveform({ audioUrl }: { audioUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bars, setBars] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(audioUrl);
        const buf = await res.arrayBuffer();
        const ctx = new AudioContext();
        const decoded = await ctx.decodeAudioData(buf);
        const raw = decoded.getChannelData(0);
        const step = Math.floor(raw.length / WAVE_BARS);
        const result: number[] = [];
        for (let i = 0; i < WAVE_BARS; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += Math.abs(raw[i * step + j]);
          result.push(sum / step);
        }
        const max = Math.max(...result, 0.01);
        if (!cancelled) setBars(result.map((v) => v / max));
        ctx.close();
      } catch {
        if (!cancelled) setBars(Array.from({ length: WAVE_BARS }, () => 0.15 + Math.random() * 0.5));
      }
    })();
    return () => { cancelled = true; };
  }, [audioUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || bars.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const barW = Math.max(2, (w - (WAVE_BARS - 1) * 2) / WAVE_BARS);
    for (let i = 0; i < bars.length; i++) {
      const barH = Math.max(3, bars[i] * h * 0.85);
      const x = i * (barW + 2);
      const y = (h - barH) / 2;
      ctx.fillStyle = "hsl(var(--muted-foreground) / 0.5)";
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, barW / 2);
      ctx.fill();
    }
  }, [bars]);

  return <canvas ref={canvasRef} width={200} height={32} className="flex-1 h-8 max-w-[200px]" />;
}

/* ── Live waveform during recording ────────────────────────────── */
function LiveWaveform({ analyserRef }: { analyserRef: React.RefObject<AnalyserNode | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const barW = Math.max(2, (w - (WAVE_BARS - 1) * 2) / WAVE_BARS);
      const step = Math.floor(dataArray.length / WAVE_BARS);
      for (let i = 0; i < WAVE_BARS; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += dataArray[i * step + j];
        const avg = sum / step / 255;
        const barH = Math.max(3, avg * h);
        const x = i * (barW + 2);
        const y = (h - barH) / 2;
        ctx.fillStyle = `hsl(142 72% ${40 + avg * 20}%)`;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, barW / 2);
        ctx.fill();
      }
    };
    draw();
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [analyserRef]);

  return <canvas ref={canvasRef} width={200} height={32} className="flex-1 h-8 max-w-[200px]" />;
}

/* ── Main component ────────────────────────────────────────────── */
export const AudioRecorder = memo(function AudioRecorder({ onSendAudio, disabled }: AudioRecorderProps) {
  const [state, setState] = useState<"idle" | "recording" | "preview" | "sending">("idle");
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        let blob = new Blob(chunksRef.current, { type: mimeType });
        if (mimeType.includes("webm")) {
          try { blob = await remuxWebmToOgg(blob); } catch (err) {
            console.error("❌ WebM→OGG conversion failed:", err);
          }
        }
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setState("preview");
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close().catch(() => {});
      };

      recorder.start(100);
      setState("recording");
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err) {
      console.error("Mic error:", err);
      toast({ title: "Microfone indisponível", description: "Verifique as permissões do navegador.", variant: "destructive" });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  }, []);

  const cancelRecording = useCallback(() => {
    if (state === "recording") {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
    }
    if (audioElRef.current) { audioElRef.current.pause(); audioElRef.current = null; }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setIsPlaying(false);
    setState("idle");
  }, [state, audioUrl]);

  const togglePlay = useCallback(() => {
    if (!audioUrl) return;
    if (isPlaying && audioElRef.current) {
      audioElRef.current.pause();
      setIsPlaying(false);
      return;
    }
    const audio = new Audio(audioUrl);
    audioElRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    audio.play();
    setIsPlaying(true);
  }, [audioUrl, isPlaying]);

  const sendAudio = useCallback(() => {
    if (!audioBlob) return;
    setState("sending");
    if (audioElRef.current) { audioElRef.current.pause(); audioElRef.current = null; }
    const ext = audioBlob.type.includes("ogg") ? "ogg" : "webm";
    const file = new File([audioBlob], `audio_${Date.now()}.${ext}`, { type: audioBlob.type });
    onSendAudio(file);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setIsPlaying(false);
    setState("idle");
  }, [audioBlob, audioUrl, onSendAudio]);

  // ── Idle: just the mic button ──
  if (state === "idle") {
    return (
      <Button
        size="icon"
        variant="ghost"
        className="h-10 w-10 rounded-lg text-muted-foreground/40 hover:text-primary"
        onClick={startRecording}
        disabled={disabled}
        title="Gravar áudio"
      >
        <Mic className="h-4 w-4" />
      </Button>
    );
  }

  // ── Recording: WhatsApp-style full bar ──
  if (state === "recording") {
    return (
      <div className="flex items-center gap-2 w-full animate-in fade-in slide-in-from-bottom-1 duration-200">
        {/* Delete / cancel */}
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 shrink-0 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={cancelRecording}
        >
          <Trash2 className="h-4.5 w-4.5" />
        </Button>

        {/* Recording bar */}
        <div className="flex items-center gap-2.5 flex-1 bg-card border border-border/30 rounded-xl px-3 py-2 min-w-0">
          {/* Pulsing red dot */}
          <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse shrink-0" />

          {/* Live waveform */}
          <LiveWaveform analyserRef={analyserRef} />

          {/* Timer */}
          <span className="text-xs font-mono text-muted-foreground tabular-nums shrink-0">
            {formatRecordTime(duration)}
          </span>
        </div>

        {/* Stop & send */}
        <Button
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full bg-primary hover:bg-primary/90"
          onClick={stopRecording}
        >
          <Square className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // ── Preview: WhatsApp-style with play, waveform, duration, send ──
  if (state === "preview") {
    return (
      <div className="flex items-center gap-2 w-full animate-in fade-in slide-in-from-bottom-1 duration-200">
        {/* Delete */}
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 shrink-0 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={cancelRecording}
        >
          <Trash2 className="h-4.5 w-4.5" />
        </Button>

        {/* Playback bar */}
        <div className="flex items-center gap-2.5 flex-1 bg-card border border-border/30 rounded-xl px-3 py-2 min-w-0">
          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="h-7 w-7 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
          </button>

          {/* Static waveform */}
          <StaticWaveform audioUrl={audioUrl!} />

          {/* Duration */}
          <span className="text-xs font-mono text-muted-foreground tabular-nums shrink-0">
            {formatRecordTime(duration)}
          </span>
        </div>

        {/* Send */}
        <Button
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full bg-primary hover:bg-primary/90"
          onClick={sendAudio}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // ── Sending ──
  return (
    <div className="flex items-center gap-2 px-3 py-2 w-full">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      <span className="text-xs text-muted-foreground/50">Enviando áudio...</span>
    </div>
  );
});
