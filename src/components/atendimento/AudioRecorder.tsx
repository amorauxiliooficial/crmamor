import { memo, useCallback, useRef, useState } from "react";
import { Mic, Square, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface AudioRecorderProps {
  onSendAudio: (file: File) => void;
  disabled?: boolean;
}

function formatRecordTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export const AudioRecorder = memo(function AudioRecorder({ onSendAudio, disabled }: AudioRecorderProps) {
  const [state, setState] = useState<"idle" | "recording" | "preview" | "sending">("idle");
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
          ? "audio/ogg;codecs=opus"
          : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setState("preview");
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(100);
      setState("recording");
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err) {
      console.error("Mic error:", err);
      toast({
        title: "Microfone indisponível",
        description: "Verifique as permissões do navegador.",
        variant: "destructive",
      });
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
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setState("idle");
  }, [state, audioUrl]);

  const sendAudio = useCallback(() => {
    if (!audioBlob) return;
    setState("sending");
    const ext = audioBlob.type.includes("ogg") ? "ogg" : "webm";
    const file = new File([audioBlob], `audio_${Date.now()}.${ext}`, { type: audioBlob.type });
    onSendAudio(file);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setState("idle");
  }, [audioBlob, audioUrl, onSendAudio]);

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

  if (state === "recording") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-destructive/5 border border-destructive/20 rounded-xl animate-in fade-in slide-in-from-bottom-1 duration-200">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse shrink-0" />
        <span className="text-xs font-mono text-destructive tabular-nums">{formatRecordTime(duration)}</span>
        <span className="text-[10px] text-muted-foreground/50">Gravando...</span>
        <div className="flex items-center gap-1 ml-auto">
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-muted-foreground/50" onClick={cancelRecording}>
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="destructive" className="h-8 w-8 rounded-lg" onClick={stopRecording}>
            <Square className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  if (state === "preview") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/20 border border-border/20 rounded-xl animate-in fade-in slide-in-from-bottom-1 duration-200">
        <audio controls src={audioUrl!} className="h-8 flex-1" style={{ maxWidth: 200 }} />
        <span className="text-[10px] text-muted-foreground/50 font-mono">{formatRecordTime(duration)}</span>
        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-muted-foreground/50" onClick={cancelRecording}>
          <X className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" className="h-8 w-8 rounded-lg" onClick={sendAudio}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  // sending
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      <span className="text-xs text-muted-foreground/50">Enviando áudio...</span>
    </div>
  );
});
