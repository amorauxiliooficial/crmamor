import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import {
  Send, X, Mic, FileText, Reply,
  Lock, MessageSquareText, Globe, StickyNote,
} from "lucide-react";
import { useAutoCorrect } from "@/hooks/useAutoCorrect";
import { AudioRecorder } from "@/components/atendimento/AudioRecorder";
import { AttachmentMenu } from "@/components/atendimento/AttachmentMenu";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Mensagem } from "@/data/atendimentoMock";
import type { RespostaRapida } from "@/data/respostasRapidas";

interface ChatInputBarProps {
  conversationId: string;
  msgText: string;
  onMsgTextChange: (v: string) => void;
  onSend: () => void;
  onSendMedia?: (file: File) => void;
  respostas: RespostaRapida[];
  isMobile: boolean;
  windowIsOpen: boolean;
  onOpenTemplateDialog: () => void;
  replyTo: Mensagem | null;
  onClearReply: () => void;
  channel: string;
  isSending?: boolean;
}

export function ChatInputBar({
  conversationId,
  msgText,
  onMsgTextChange,
  onSend,
  onSendMedia,
  respostas,
  isMobile,
  windowIsOpen,
  onOpenTemplateDialog,
  replyTo,
  onClearReply,
  channel,
  isSending = false,
}: ChatInputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplyIndex, setQuickReplyIndex] = useState(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [agentNote, setAgentNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const handleAutoCorrect = useAutoCorrect(onMsgTextChange);
  const { toast } = useToast();

  const filteredReplies = useMemo(() => {
    if (!msgText.startsWith("/")) return [];
    const query = msgText.slice(1).toLowerCase();
    return respostas.filter((r) => r.atalho.toLowerCase().includes(query));
  }, [msgText, respostas]);

  useEffect(() => {
    const shouldShow = msgText.startsWith("/") && filteredReplies.length > 0;
    setShowQuickReplies(shouldShow);
    if (shouldShow) setQuickReplyIndex(0);
  }, [msgText, filteredReplies.length]);

  const selectQuickReply = useCallback((texto: string) => {
    onMsgTextChange(texto);
    setShowQuickReplies(false);
    textareaRef.current?.focus();
  }, [onMsgTextChange]);

  const handleFileFromMenu = useCallback((file: File) => {
    setPendingFile(file);
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      setPendingPreview(URL.createObjectURL(file));
    } else {
      setPendingPreview("file");
    }
  }, []);

  const handleSaveAgentNote = useCallback(async () => {
    if (!agentNote.trim()) return;
    setSavingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("conversation_events").insert({
        conversation_id: conversationId,
        event_type: "agent_note",
        created_by_agent_id: user?.id,
        meta: { note: agentNote.trim() },
      } as any);
      if (error) throw error;
      toast({ title: "Nota salva ✅" });
      setAgentNote("");
    } catch {
      toast({ title: "Erro ao salvar nota", variant: "destructive" });
    } finally {
      setSavingNote(false);
    }
  }, [agentNote, conversationId, toast]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (showQuickReplies) {
      if (e.key === "ArrowDown") { e.preventDefault(); setQuickReplyIndex((i) => Math.min(i + 1, filteredReplies.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setQuickReplyIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter") { e.preventDefault(); selectQuickReply(filteredReplies[quickReplyIndex].texto); return; }
      if (e.key === "Escape") { e.preventDefault(); setShowQuickReplies(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSending) onSend();
    }
  }

  return (
    <div className="relative border-t border-border/10 w-full overflow-x-hidden">
      {/* Web channel warning */}
      {channel === "web_manual_team" && (
        <div className="mx-4 mt-2 mb-1 p-2.5 bg-amber-500/5 border border-amber-500/10 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
          <Globe className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Atendimento manual no WhatsApp Web</p>
            <p className="text-[10px] text-amber-600/60 dark:text-amber-400/60">IA automática desabilitada — use as notas do atendente para registrar o andamento</p>
          </div>
        </div>
      )}

      {/* Agent notes input */}
      {channel === "web_manual_team" && (
        <div className="mx-4 mt-2 mb-1 p-2.5 bg-muted/5 border border-border/15 rounded-lg space-y-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
          <div className="flex items-center gap-1.5">
            <StickyNote className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="text-[11px] font-medium text-muted-foreground/60">Nota do atendente</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Registre uma nota sobre o atendimento..."
              value={agentNote}
              onChange={(e) => setAgentNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && agentNote.trim()) { e.preventDefault(); handleSaveAgentNote(); } }}
              className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground/30"
            />
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs shrink-0" onClick={handleSaveAgentNote} disabled={!agentNote.trim() || savingNote}>
              <Send className="h-3 w-3" /> Salvar
            </Button>
          </div>
        </div>
      )}

      {/* Window closed banner */}
      {!windowIsOpen && (
        <div className="mx-4 mt-2 mb-1 p-2.5 bg-destructive/5 border border-destructive/10 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
          <Lock className="h-4 w-4 text-destructive/60 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-destructive/80">Janela de 24h fechada</p>
            <p className="text-[10px] text-destructive/50">Envie um template aprovado para retomar a conversa</p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0 text-xs h-7 gap-1 border-destructive/20 text-destructive/70 hover:bg-destructive/5" onClick={onOpenTemplateDialog}>
            <MessageSquareText className="h-3 w-3" /> Enviar Template
          </Button>
        </div>
      )}

      {/* Quick replies */}
      {showQuickReplies && (
        <div className="absolute bottom-full left-0 right-0 mx-4 mb-1.5 bg-popover border border-border/20 rounded-xl shadow-lg max-h-[200px] overflow-y-auto z-50">
          {filteredReplies.map((r, i) => (
            <button
              key={r.id}
              className={cn("w-full text-left px-3 py-2.5 text-xs hover:bg-muted/20 transition-colors first:rounded-t-xl last:rounded-b-xl", i === quickReplyIndex && "bg-muted/20")}
              onMouseDown={(e) => { e.preventDefault(); selectQuickReply(r.texto); }}
            >
              <span className="font-medium text-primary text-[11px]">/{r.atalho}</span>
              <span className="ml-2 text-muted-foreground/40 text-[11px]">{r.titulo}</span>
            </button>
          ))}
        </div>
      )}

      {/* Reply quote */}
      {replyTo && (
        <div className="mx-4 mt-2 mb-1 p-2 bg-muted/10 border-l-2 border-primary/30 rounded-r-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
          <Reply className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground/50">
              {replyTo.de === "atendente" ? (replyTo.sentByAgentName || "Você") : "Contato"}
            </p>
            <p className="text-[11px] text-muted-foreground/40 truncate">{replyTo.texto || `[${replyTo.msgType}]`}</p>
          </div>
          <Button size="icon" variant="ghost" className="h-6 w-6 rounded-lg shrink-0" onClick={onClearReply}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Pending file preview */}
      {pendingFile && pendingPreview && (
        <div className="mx-4 mt-2 mb-1 p-2 bg-muted/10 border border-border/10 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
          {pendingFile.type.startsWith("image/") ? (
            <img src={pendingPreview} alt="Preview" className="h-14 w-14 rounded-lg object-cover" />
          ) : pendingFile.type.startsWith("video/") ? (
            <video src={pendingPreview} className="h-14 w-14 rounded-lg object-cover" muted />
          ) : pendingFile.type.startsWith("audio/") ? (
            <div className="h-14 w-14 rounded-lg bg-muted/20 flex items-center justify-center"><Mic className="h-5 w-5 text-muted-foreground/50" /></div>
          ) : (
            <div className="h-14 w-14 rounded-lg bg-muted/20 flex items-center justify-center"><FileText className="h-5 w-5 text-muted-foreground/50" /></div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate">{pendingFile.name}</p>
            <p className="text-[10px] text-muted-foreground/40">{(pendingFile.size / 1024).toFixed(0)} KB</p>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg shrink-0" onClick={() => { setPendingFile(null); setPendingPreview(null); }}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="flex gap-2 items-end px-4 pb-3 pt-2">
        <div className="flex gap-0.5 shrink-0">
          <AttachmentMenu onFileSelected={handleFileFromMenu} />
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg text-muted-foreground/30 hover:text-muted-foreground/60" onClick={onOpenTemplateDialog}>
                  <MessageSquareText className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Enviar Template</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Textarea
          ref={textareaRef}
          placeholder={!windowIsOpen ? "Janela fechada — use um template" : pendingFile ? "Legenda (opcional)..." : "Mensagem..."}
          value={msgText}
          onChange={(e) => {
            handleAutoCorrect(e.target.value, msgText);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }}
          onKeyDown={handleKeyDown}
          disabled={!windowIsOpen}
          spellCheck={true}
          autoComplete="off"
          autoCapitalize="sentences"
          lang="pt-BR"
          className={cn(
            "min-h-[42px] max-h-[120px] resize-none text-[14px] flex-1 rounded-xl bg-muted/10 border-border/10 focus-visible:border-primary/20 focus-visible:bg-background transition-all",
            (!windowIsOpen || isSending) && "opacity-50 cursor-not-allowed"
          )}
          rows={1}
        />

        {!msgText.trim() && !pendingFile ? (
          <AudioRecorder onSendAudio={(file) => { if (onSendMedia) onSendMedia(file); }} />
        ) : (
          <Button
            size="icon"
            onClick={() => {
              if (pendingFile && onSendMedia) {
                onSendMedia(pendingFile);
                setPendingFile(null);
                setPendingPreview(null);
              } else {
                onSend();
              }
            }}
            disabled={(!msgText.trim() && !pendingFile) || !windowIsOpen}
            className="shrink-0 rounded-xl h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!isMobile && (
        <div className="text-center pb-1">
          <span className="text-[9px] text-muted-foreground/20">Enter envia · Shift+Enter nova linha · / templates · ⌘K buscar</span>
        </div>
      )}
    </div>
  );
}
