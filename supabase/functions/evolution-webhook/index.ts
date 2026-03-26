import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { Send, X, Mic, FileText, Reply, Lock, MessageSquareText, Globe, StickyNote } from "lucide-react";
import { useAutoCorrect } from "@/hooks/useAutoCorrect";
import { AudioRecorder } from "@/components/atendimento/AudioRecorder";
import { AttachmentMenu } from "@/components/atendimento/AttachmentMenu";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatInputBarProps = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onCancelReply?: () => void;
  replyingTo?: {
    id: string;
    body: string;
    direction?: "in" | "out";
    msg_type?: string;
  } | null;
  disabled?: boolean;
  sending?: boolean;
  windowIsOpen?: boolean;
  channel?: string;
  onSendAudio?: (audioUrl: string, mimeType?: string, filename?: string) => Promise<void> | void;
  onSendMedia?: (file: File, caption?: string) => Promise<void> | void;
  placeholder?: string;
};

export function ChatInputBar({
  value,
  onChange,
  onSend,
  onCancelReply,
  replyingTo,
  disabled,
  sending,
  windowIsOpen = true,
  channel,
  onSendAudio,
  onSendMedia,
  placeholder = "Digite uma mensagem…",
}: ChatInputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);

  const { applyAutoCorrect } = useAutoCorrect();

  const canSendAudio = useMemo(() => !!onSendAudio && !disabled && !sending, [onSendAudio, disabled, sending]);
  const canSendMedia = useMemo(() => !!onSendMedia && !disabled && !sending, [onSendMedia, disabled, sending]);

  const safeValue = value ?? "";

  const focusTextarea = useCallback(() => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    if (replyingTo) focusTextarea();
  }, [replyingTo, focusTextarea]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !sending) {
        onSend();
      }
    }
  };

  const handleSendClick = () => {
    if (!disabled && !sending) {
      onSend();
    }
  };

  const handleCancelReply = () => {
    onCancelReply?.();
    focusTextarea();
  };

  const handlePickAttachment = async (file: File) => {
    try {
      setShowAttachments(false);
      if (!onSendMedia) return;
      await onSendMedia(file, safeValue);
      onChange("");
      focusTextarea();
    } catch (err) {
      console.error("Failed to send media", err);
    }
  };

  const handleAudioRecorded = async (audioUrl: string, mimeType?: string, filename?: string) => {
    try {
      setIsRecording(false);
      if (!onSendAudio) return;
      await onSendAudio(audioUrl, mimeType, filename);
      focusTextarea();
    } catch (err) {
      console.error("Failed to send audio", err);
    }
  };

  const handleAutoCorrect = async () => {
    const corrected = await applyAutoCorrect(safeValue);
    if (corrected && corrected !== safeValue) onChange(corrected);
    focusTextarea();
  };

  const isInputDisabled = !!disabled || !!sending;

  return (
    <div className="relative border-t border-border/10 w-full overflow-x-hidden">
      {/* Web channel warning */}
      {channel === "web_manual_team" && (
        <div className="mx-4 mt-2 mb-1 p-2.5 bg-amber-500/5 border border-amber-500/10 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
          <Globe className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Atendimento manual no WhatsApp Web</p>
            <p className="text-[11px] text-amber-700/70 dark:text-amber-300/70">
              Mensagens podem não seguir a janela oficial de 24h.
            </p>
          </div>
        </div>
      )}

      {/* Window closed banner */}
      {!windowIsOpen && channel !== "evolution" && (
        <div className="mx-4 mt-2 mb-1 px-3 py-2 bg-destructive/5 border border-destructive/10 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
          <Lock className="h-4 w-4 text-destructive/60 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-destructive/80">Janela de 24h fechada</p>
            <p className="text-[11px] text-destructive/60">Envie um template aprovado para retomar a conversa.</p>
          </div>
        </div>
      )}

      {/* Reply banner */}
      {replyingTo && (
        <div className="mx-4 mt-2 mb-1 px-3 py-2 bg-muted/40 border border-border/10 rounded-xl flex items-start gap-2">
          <Reply className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground">Respondendo</p>
            <p className="text-xs text-foreground/80 truncate">
              {replyingTo.body || `[${replyingTo.msg_type || "mensagem"}]`}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancelReply}
            className="p-1 rounded-md hover:bg-muted transition"
            aria-label="Cancelar resposta"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}

      <div className="p-3 flex items-end gap-2">
        {/* Left actions */}
        <div className="flex items-center gap-1 pb-1">
          {canSendMedia && (
            <AttachmentMenu
              open={showAttachments}
              onOpenChange={setShowAttachments}
              onPickFile={handlePickAttachment}
              disabled={isInputDisabled}
            />
          )}

          {canSendAudio && (
            <button
              type="button"
              className={cn(
                "h-9 w-9 rounded-full flex items-center justify-center transition",
                isRecording ? "bg-primary/10" : "hover:bg-muted",
                isInputDisabled && "opacity-50 pointer-events-none",
              )}
              onClick={() => setIsRecording((v) => !v)}
              aria-label="Gravar áudio"
            >
              <Mic className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted transition",
              isInputDisabled && "opacity-50 pointer-events-none",
            )}
            onClick={handleAutoCorrect}
            aria-label="Auto-correção"
          >
            <StickyNote className="h-4 w-4" />
          </button>
        </div>

        {/* Input */}
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={safeValue}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isInputDisabled}
            placeholder={placeholder}
            className="min-h-[44px] max-h-[160px] resize-none rounded-2xl px-4 py-3 leading-5"
          />
        </div>

        {/* Send */}
        <Button
          type="button"
          onClick={handleSendClick}
          disabled={isInputDisabled || safeValue.trim().length === 0}
          className="h-11 w-11 rounded-full p-0"
        >
          {sending ? <MessageSquareText className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>

      {/* Audio recorder modal-ish */}
      {isRecording && canSendAudio && (
        <div className="px-3 pb-3">
          <AudioRecorder onCancel={() => setIsRecording(false)} onRecorded={handleAudioRecorded} />
        </div>
      )}
    </div>
  );
}
