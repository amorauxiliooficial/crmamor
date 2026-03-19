import { useRef, useEffect, useState, useMemo, useCallback, memo } from "react";
import {
  Send, ArrowLeft, User, Clock, CheckCircle,
  FileText, Sparkles, Mic, PanelRightOpen, PanelRightClose,
  Loader2, Brain, Database, ArrowRight,
  X, RotateCcw, MoreVertical, Pencil, Bot,
  ArrowRightLeft, Wifi, WifiOff, RotateCw,
  Pin, Star, Reply, UserCheck, Tag, Bell, BellOff, Info,
  Lock, MessageSquareText, Globe, Smartphone, StickyNote,
} from "lucide-react";
import { useAutoCorrect } from "@/hooks/useAutoCorrect";
import { WindowBadge, useWindowStatus } from "@/components/atendimento/WindowBadge";
import { SendTemplateDialog } from "@/components/atendimento/SendTemplateDialog";
import { ConsumptionBadge } from "@/components/atendimento/ConsumptionBadge";
import { AudioRecorder } from "@/components/atendimento/AudioRecorder";
import { MessageStatusIcon } from "@/components/atendimento/MessageStatusIcon";
import { AttachmentMenu } from "@/components/atendimento/AttachmentMenu";
import { MessageContextMenu } from "@/components/atendimento/MessageContextMenu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { getContactDisplay } from "@/lib/contactDisplay";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MediaBubble } from "@/components/atendimento/MediaBubble";
import type { Conversa, Mensagem } from "@/data/atendimentoMock";
import type { RespostaRapida } from "@/data/respostasRapidas";
import type { ConversationEvent } from "@/hooks/useConversationEvents";
import type { ConnectionStatus } from "@/hooks/useRealtimeConnection";

const QUEUE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  novo: { label: "Novo atendimento", color: "text-primary" },
  em_atendimento: { label: "Em atendimento", color: "text-emerald-600 dark:text-emerald-400" },
  aguardando_cliente: { label: "Aguardando cliente", color: "text-amber-600 dark:text-amber-400" },
  encerrado: { label: "Encerrado", color: "text-muted-foreground" },
};

const ETIQUETAS_OPTIONS = ["Suporte", "Financeiro", "Reclamação", "Venda", "Urgente"];

const MESSAGES_PER_PAGE = 50;

function formatDayLabel(d: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoje";
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function shouldShowTimestamp(current: Mensagem, prev: Mensagem | null): boolean {
  if (!prev) return true;
  return current.horario.getTime() - prev.horario.getTime() > 5 * 60000;
}

function isSameAuthorGroup(current: Mensagem, prev: Mensagem | null): boolean {
  if (!prev) return false;
  return current.de === prev.de 
    && current.sentByAgentId === prev.sentByAgentId
    && current.horario.getTime() - prev.horario.getTime() < 2 * 60000;
}

/** Position within a consecutive author block */
type BubblePosition = "solo" | "first" | "middle" | "last";

function getBubblePosition(
  msg: Mensagem,
  prev: Mensagem | null,
  next: Mensagem | null,
): BubblePosition {
  const groupedWithPrev = isSameAuthorGroup(msg, prev);
  const groupedWithNext = next ? isSameAuthorGroup(next, msg) : false;
  if (!groupedWithPrev && !groupedWithNext) return "solo";
  if (!groupedWithPrev && groupedWithNext) return "first";
  if (groupedWithPrev && groupedWithNext) return "middle";
  return "last";
}

function getBubbleRounding(isMe: boolean, pos: BubblePosition): string {
  // WhatsApp Desktop: 8px radius, small tail on first/solo
  if (pos === "solo") return isMe ? "rounded-[8px] rounded-br-[3px]" : "rounded-[8px] rounded-bl-[3px]";
  if (pos === "first") return isMe ? "rounded-[8px] rounded-br-[3px]" : "rounded-[8px] rounded-bl-[3px]";
  if (pos === "middle") return isMe ? "rounded-[8px] rounded-r-[3px]" : "rounded-[8px] rounded-l-[3px]";
  return isMe ? "rounded-[8px] rounded-tr-[3px]" : "rounded-[8px] rounded-tl-[3px]";
}

/** Detect URLs in text and render as clickable links */
function renderTextWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  const parts = text.split(urlRegex);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0; // reset
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:opacity-80 break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

function MessageSkeleton() {
  return (
    <div className="px-6 py-4 space-y-4 max-w-3xl mx-auto">
      {[1, 2, 3].map((i) => (
        <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
          <div className="space-y-1.5">
            <Skeleton className={cn("h-10 rounded-2xl", i % 2 === 0 ? "w-56" : "w-64")} />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

const EDIT_TIME_LIMIT_MIN = 15;

const MessageBubble = memo(function MessageBubble({
  message: m,
  position,
  showTime,
  showAuthorLabel,
  showAvatar,
  onRetry,
  currentUserId,
  onEditMessage,
  profileMap,
}: {
  message: Mensagem;
  position: BubblePosition;
  showTime: boolean;
  showAuthorLabel: boolean;
  showAvatar: boolean;
  onRetry?: (m: Mensagem) => void;
  currentUserId?: string | null;
  onEditMessage?: (messageId: string, newBody: string) => void;
  profileMap?: Map<string, string>;
}) {
  const isMe = m.de === "atendente";
  const MEDIA_TYPES = ["image", "audio", "video", "document", "sticker"];
  const isMedia = m.msgType ? MEDIA_TYPES.includes(m.msgType) : false;
  const isFailed = isMe && m.status === "failed";
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(m.texto);
  const [menuOpen, setMenuOpen] = useState(false);

  const canEdit = isMe
    && m.sentByAgentId === currentUserId
    && m.msgType === "text"
    && !isFailed
    && (Date.now() - m.horario.getTime()) < EDIT_TIME_LIMIT_MIN * 60 * 1000;

  const handleSaveEdit = () => {
    if (editText.trim() && editText.trim() !== m.texto && onEditMessage) {
      onEditMessage(m.id, editText.trim());
    }
    setEditing(false);
  };

  const isGrouped = position === "middle" || position === "last";
  const rounding = getBubbleRounding(isMe, position);

  // Avatar: silhouette fallback
  const avatarInitial = isMe
    ? (m.sentByAgentName ? m.sentByAgentName.charAt(0).toUpperCase() : null)
    : null;

  return (
    <div
      className={cn(
        "flex w-full min-w-0 overflow-hidden group",
        isMe ? "justify-end" : "justify-start",
        isGrouped ? "mt-0.5" : "mt-3"
      )}
    >
      {/* Left avatar slot (contact messages) */}
      {!isMe && (
        <div className="w-7 shrink-0 flex flex-col justify-end mr-1">
          {showAvatar && (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] font-semibold bg-muted/30 text-foreground/50">
                <User className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div className={cn("max-w-[85%] sm:max-w-[65%] overflow-hidden min-w-0 flex flex-col", isMe ? "items-end" : "items-start")}>
        {/* Author label — shown on first msg of block when multiple agents */}
        {showAuthorLabel && isMe && m.sentByAgentName && (
          <p className="text-[10px] text-muted-foreground/40 font-medium mb-0.5 px-2">
            {m.sentByAgentName} • atendente
          </p>
        )}

        {editing ? (
          <div className="flex flex-col gap-1.5 w-full min-w-[200px]">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="text-[14px] leading-relaxed p-2.5 rounded-xl bg-muted/30 border border-border/30 text-foreground resize-none min-h-[44px] focus:outline-none focus:ring-1 focus:ring-primary/30"
              rows={2}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
                if (e.key === "Escape") { setEditing(false); setEditText(m.texto); }
              }}
            />
            <div className="flex gap-1 justify-end">
              <button
                onClick={() => { setEditing(false); setEditText(m.texto); }}
                className="text-[10px] px-2.5 py-1 rounded-lg text-muted-foreground hover:bg-muted/30 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editText.trim() || editText.trim() === m.texto}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            {canEdit && onEditMessage && (
              <div className={cn(
                "absolute z-10",
                isMe ? "right-1 top-1" : "left-1 top-1",
                "opacity-0 group-hover:opacity-100 transition-opacity"
              )}>
                <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                  <PopoverTrigger asChild>
                    <button className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted/40 text-muted-foreground/30 hover:text-muted-foreground transition-colors">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-32 p-1" align={isMe ? "start" : "end"} side="top">
                    <button
                      className="w-full flex items-center gap-2 px-2.5 py-2 text-xs hover:bg-accent/30 rounded-lg transition-colors"
                      onClick={() => { setEditing(true); setMenuOpen(false); }}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div
              className={cn(
                "relative overflow-hidden break-words min-w-0 shadow-[0_1px_0.5px_rgba(0,0,0,0.06)]",
                isMedia ? "p-[3px]" : "px-[9px] py-[6px]",
                isMe
                  ? cn("bg-chat-outbound text-chat-outbound-foreground", rounding)
                  : cn("bg-chat-inbound text-chat-inbound-foreground", rounding),
                isFailed && "ring-1 ring-destructive/30"
              )}
              style={{ fontFamily: "var(--chat-font, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif)" }}
            >
              {isMedia ? (
                <MediaBubble
                  msgType={m.msgType!}
                  mediaUrl={m.mediaUrl ?? null}
                  mediaMime={m.mediaMime ?? null}
                  mediaFilename={m.mediaFilename ?? null}
                  mediaSize={m.mediaSize ?? null}
                  mediaDuration={m.mediaDuration ?? null}
                  caption={m.texto !== `[${m.msgType}]` ? m.texto : null}
                  isMe={isMe}
                />
              ) : (
                <span
                  className="text-[14.2px] leading-[19px] whitespace-pre-wrap"
                  style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
                >
                  {m.msgType === "reaction" ? "❤️" : m.msgType === "unsupported" ? "⚠️ Mensagem não suportada" : /^\[.+\]$/.test(m.texto.trim()) ? "" : renderTextWithLinks(m.texto)}
                </span>
              )}

              {/* Time + ticks — WhatsApp: float-right inside bubble */}
              <span className={cn(
                "inline-flex items-center gap-0.5 float-right ml-2 mt-[3px] relative -mb-[3px]",
                isMedia ? "px-1.5 pb-0.5" : ""
              )}>
                {m.editedAt && (
                  <span className="text-[11px] italic text-chat-meta/40 mr-0.5">editada</span>
                )}
                <span className="text-[11px] tabular-nums text-chat-meta/55">
                  {m.horario.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                {isMe && (
                  <MessageStatusIcon
                    status={m.status}
                    errorMessage={m.errorMessage}
                    className="!h-[14px] !w-[14px]"
                  />
                )}
              </span>
            </div>
          </div>
        )}

        {isFailed && onRetry && (
          <button
            onClick={() => onRetry(m)}
            className="flex items-center gap-1 mt-1 px-2 py-1 text-[10px] text-destructive hover:text-destructive/80 hover:bg-destructive/5 rounded-md transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Reenviar
          </button>
        )}
      </div>

      {/* Right avatar slot (agent messages) */}
      {isMe && (
        <div className="w-7 shrink-0 flex flex-col justify-end ml-1">
          {showAvatar && (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary/70">
                {avatarInitial || <User className="h-3 w-3" />}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}
    </div>
  );
});

type AiAction = "suggest" | "summarize" | "extract" | "next_action";

const EVENT_LABELS: Record<string, { icon: string; label: string }> = {
  assumed: { icon: "👤", label: "assumiu a conversa" },
  transfer: { icon: "↗️", label: "transferiu a conversa" },
  closed: { icon: "✅", label: "encerrou a conversa" },
  reopened: { icon: "🔄", label: "reabriu a conversa" },
  status_change: { icon: "📋", label: "alterou o status" },
  ai_replied: { icon: "🤖", label: "IA respondeu" },
  ai_handoff: { icon: "🤝", label: "IA transferiu para humano" },
  ai_error: { icon: "⚠️", label: "erro na IA" },
  channel_to_web: { icon: "🌐", label: "transferiu para Web" },
  channel_to_official: { icon: "📱", label: "voltou para Oficial" },
  agent_note: { icon: "📝", label: "nota" },
};

function InlineEvent({ event, profileMap }: { event: ConversationEvent; profileMap?: Map<string, string> }) {
  const info = EVENT_LABELS[event.event_type] || { icon: "📌", label: event.event_type };
  const agentName = event.created_by_agent_id && profileMap ? profileMap.get(event.created_by_agent_id) ?? "Agente" : "Sistema";
  const toAgent = event.to_agent_id && profileMap ? profileMap.get(event.to_agent_id) : null;
  const reason = (event.meta as any)?.reason;
  const note = (event.meta as any)?.note;

  // Agent note: render as a special card
  if (event.event_type === "agent_note" && note) {
    return (
      <div className="flex items-center justify-center my-3">
        <div className="inline-flex flex-col gap-1 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/10 text-[11px] text-muted-foreground/60 max-w-[80%]">
          <div className="flex items-center gap-1.5">
            <span>📝</span>
            <span className="font-medium">{agentName}</span>
            <span className="text-muted-foreground/25 ml-auto">
              {new Date(event.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <p className="text-xs whitespace-pre-line text-foreground/60">{note}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center my-3">
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/15 text-[11px] text-muted-foreground/50 max-w-[80%]">
        <span>{info.icon}</span>
        <span className="font-medium">{agentName}</span>
        <span>{info.label}</span>
        {toAgent && <span>para <span className="font-medium">{toAgent}</span></span>}
        {reason && <span className="italic truncate max-w-[120px]">• {reason}</span>}
        <span className="text-muted-foreground/25 ml-1">
          {new Date(event.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

interface ChatPanelProps {
  conversa: Conversa | null;
  mensagens: Mensagem[];
  isMobile: boolean;
  msgText: string;
  onMsgTextChange: (v: string) => void;
  onSend: () => void;
  onSendMedia?: (file: File) => void;
  onRetry?: (messageId: string, body: string, msgType?: string, mediaUrl?: string, mediaMime?: string, mediaFilename?: string) => void;
  onBack: () => void;
  onAssume: () => void;
  onPendente: () => void;
  onFinalizar: () => void;
  onReopen?: () => void;
  onTransfer?: () => void;
  onToggleEtiqueta: (e: string) => void;
  respostas: RespostaRapida[];
  showContext?: boolean;
  onToggleContext?: () => void;
  isLoadingMessages?: boolean;
  currentUserId?: string | null;
  onEditMessage?: (messageId: string, newBody: string) => void;
  soundEnabled?: boolean;
  autoplayBlocked?: boolean;
  onToggleSound?: () => void;
  connectionStatus?: ConnectionStatus;
  onReconnect?: () => void;
  conversationEvents?: ConversationEvent[];
  profileMap?: Map<string, string>;
  aiEnabled?: boolean;
  onToggleAi?: () => void;
  aiAgents?: { id: string; name: string; model: string }[];
  selectedAiAgentId?: string | null;
  onChangeAiAgent?: (agentId: string | null) => void;
  lastInboundAt?: Date | null;
  conversationPhone?: string;
  channel?: string;
  onChangeChannel?: (channel: string) => void;
  onTransferToWeb?: () => void;
}

export function ChatPanel({
  conversa,
  mensagens,
  isMobile,
  msgText,
  onMsgTextChange,
  onSend,
  onSendMedia,
  onRetry,
  onBack,
  onAssume,
  onPendente,
  onFinalizar,
  onReopen,
  onTransfer,
  onToggleEtiqueta,
  respostas,
  showContext,
  onToggleContext,
  isLoadingMessages = false,
  currentUserId,
  onEditMessage,
  soundEnabled,
  autoplayBlocked,
  onToggleSound,
  connectionStatus = "connected",
  onReconnect,
  conversationEvents = [],
  profileMap,
  aiEnabled,
  onToggleAi,
  aiAgents = [],
  selectedAiAgentId,
  onChangeAiAgent,
  lastInboundAt,
  conversationPhone,
  channel = "official",
  onChangeChannel,
  onTransferToWeb,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [agentNote, setAgentNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const isNearBottomRef = useRef(true);
  const prevConversationIdRef = useRef<string | null>(null);
  const prevMsgCountRef = useRef(0);

  const effectiveLastInboundAt = useMemo(() => {
    const dbLastInbound = lastInboundAt ?? null;
    const inboundFromMessages = mensagens
      .filter((m) => m.de !== "atendente")
      .reduce<Date | null>((latest, m) => {
        if (!latest) return m.horario;
        return m.horario > latest ? m.horario : latest;
      }, null);

    if (!dbLastInbound) return inboundFromMessages;
    if (!inboundFromMessages) return dbLastInbound;
    return inboundFromMessages > dbLastInbound ? inboundFromMessages : dbLastInbound;
  }, [lastInboundAt, mensagens]);

  const windowStatus = useWindowStatus(effectiveLastInboundAt);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplyIndex, setQuickReplyIndex] = useState(0);
  const [aiLoading, setAiLoading] = useState<AiAction | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{ type: AiAction; text: string } | null>(null);
  const [visibleCount, setVisibleCount] = useState(MESSAGES_PER_PAGE);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Mensagem | null>(null);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try { const v = localStorage.getItem("atd_pinned"); return v ? new Set(JSON.parse(v)) : new Set(); } catch { return new Set(); }
  });
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(() => {
    try { const v = localStorage.getItem("atd_favorited"); return v ? new Set(JSON.parse(v)) : new Set(); } catch { return new Set(); }
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
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

  const selectQuickReply = useCallback(
    (texto: string) => {
      onMsgTextChange(texto);
      setShowQuickReplies(false);
      textareaRef.current?.focus();
    },
    [onMsgTextChange]
  );

  // Scroll to bottom helper
  const scrollToBottom = useCallback((instant = false) => {
    const vp = scrollViewportRef.current;
    if (vp) {
      if (instant) {
        vp.scrollTop = vp.scrollHeight;
      } else {
        vp.scrollTo({ top: vp.scrollHeight, behavior: "smooth" });
      }
    }
  }, []);

  // Track if user is near the bottom
  useEffect(() => {
    const vp = scrollViewportRef.current;
    if (!vp) return;
    const handleScroll = () => {
      const threshold = 150;
      isNearBottomRef.current = vp.scrollHeight - vp.scrollTop - vp.clientHeight < threshold;
    };
    vp.addEventListener("scroll", handleScroll, { passive: true });
    return () => vp.removeEventListener("scroll", handleScroll);
  }, [conversa?.id]);

  // On conversation change: instant scroll to bottom
  useEffect(() => {
    if (conversa?.id !== prevConversationIdRef.current) {
      prevConversationIdRef.current = conversa?.id ?? null;
      isNearBottomRef.current = true;
      // Wait for messages to render
      requestAnimationFrame(() => {
        scrollToBottom(true);
        // Double-ensure after images/media load
        setTimeout(() => scrollToBottom(true), 100);
      });
    }
  }, [conversa?.id, scrollToBottom]);

  // On new messages: scroll to bottom only if user was near bottom
  useEffect(() => {
    if (mensagens.length > 0 && mensagens.length !== prevMsgCountRef.current) {
      const isInitialLoad = prevMsgCountRef.current === 0;
      prevMsgCountRef.current = mensagens.length;
      if (isInitialLoad || isNearBottomRef.current) {
        requestAnimationFrame(() => scrollToBottom(isInitialLoad));
      }
    }
  }, [mensagens.length, scrollToBottom]);

  useEffect(() => {
    setSummary(null);
    setAiResult(null);
    setVisibleCount(MESSAGES_PER_PAGE);
    setReplyTo(null);
    setShowFavoritesOnly(false);
    prevMsgCountRef.current = 0;
  }, [conversa?.id]);

  const handlePin = useCallback((m: Mensagem) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(m.id)) { next.delete(m.id); toast({ title: "Mensagem desafixada" }); }
      else { next.add(m.id); toast({ title: "Mensagem fixada 📌" }); }
      localStorage.setItem("atd_pinned", JSON.stringify([...next]));
      return next;
    });
  }, [toast]);

  const handleFavorite = useCallback((m: Mensagem) => {
    setFavoritedIds((prev) => {
      const next = new Set(prev);
      if (next.has(m.id)) { next.delete(m.id); toast({ title: "Removido dos favoritos" }); }
      else { next.add(m.id); toast({ title: "Mensagem favoritada ⭐" }); }
      localStorage.setItem("atd_favorited", JSON.stringify([...next]));
      return next;
    });
  }, [toast]);

  const handleDeleteMessage = useCallback((m: Mensagem) => {
    toast({ title: "Mensagem apagada 🗑️", description: "Apenas local" });
  }, [toast]);

  const handleFileFromMenu = useCallback((file: File) => {
    setPendingFile(file);
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      setPendingPreview(URL.createObjectURL(file));
    } else {
      setPendingPreview("file");
    }
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (showQuickReplies) {
      if (e.key === "ArrowDown") { e.preventDefault(); setQuickReplyIndex((i) => Math.min(i + 1, filteredReplies.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setQuickReplyIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter") { e.preventDefault(); selectQuickReply(filteredReplies[quickReplyIndex].texto); return; }
      if (e.key === "Escape") { e.preventDefault(); setShowQuickReplies(false); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  const handleAiAction = useCallback(async (action: AiAction) => {
    if (!conversa || mensagens.length === 0) return;
    setAiLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-conversation", {
        body: {
          messages: mensagens.map((m) => ({ de: m.de, texto: m.texto })),
          contactName: conversa.nome ?? conversa.telefone,
          action,
        },
      });
      if (error) throw error;

      if (action === "summarize") {
        setSummary(data.summary);
      } else if (action === "suggest") {
        onMsgTextChange(data.summary || data.suggestion || "");
        textareaRef.current?.focus();
      } else {
        setAiResult({ type: action, text: data.summary || data.result || "" });
      }
      toast({ title: action === "summarize" ? "Resumo gerado ✨" : action === "suggest" ? "Sugestão inserida ✨" : "Análise IA concluída ✨" });
    } catch (err) {
      console.error("AI action error:", err);
      toast({ title: "Erro na IA", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setAiLoading(null);
    }
  }, [conversa, mensagens, toast, onMsgTextChange]);

  const handleSaveAgentNote = useCallback(async () => {
    if (!agentNote.trim() || !conversa) return;
    setSavingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("conversation_events").insert({
        conversation_id: conversa.id,
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
  }, [agentNote, conversa, toast]);

  // Pagination
  const paginatedMessages = useMemo(() => {
    if (mensagens.length <= visibleCount) return mensagens;
    return mensagens.slice(mensagens.length - visibleCount);
  }, [mensagens, visibleCount]);

  const hasMore = mensagens.length > visibleCount;

  const messageGroups = useMemo(() => {
    const groups: { label: string; messages: Mensagem[] }[] = [];
    let currentLabel = "";
    paginatedMessages.forEach((m) => {
      const label = formatDayLabel(m.horario);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, messages: [m] });
      } else {
        groups[groups.length - 1].messages.push(m);
      }
    });
    return groups;
  }, [paginatedMessages]);

  if (!conversa) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 h-full bg-background">
        <div className="h-14 w-14 rounded-2xl bg-muted/15 flex items-center justify-center">
          <MessageSquare className="h-6 w-6 text-muted-foreground/20" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-muted-foreground/50">Selecione uma conversa</p>
          <p className="text-xs text-muted-foreground/30">⌘K para buscar</p>
        </div>
      </div>
    );
  }

  // Connection indicator dot
  const connectionDot = connectionStatus === "connected"
    ? "bg-emerald-500"
    : connectionStatus === "connecting"
      ? "bg-amber-500 animate-pulse"
      : "bg-destructive";

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 w-full overflow-x-hidden bg-background">
      {/* ── Header ── Clean & minimal */}
      <div className="border-b border-border/15 px-4 py-2.5 flex items-center gap-3 shrink-0">
        {isMobile && (
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="bg-muted/20 text-muted-foreground/40">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>

        {(() => {
          const ci = getContactDisplay(conversa.nome, conversa.waName, conversa.telefone);
          return (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-[15px] truncate">{ci.displayName}</p>
                <span className={cn("h-2 w-2 rounded-full shrink-0", connectionDot)} />
                <WindowBadge
                  lastInboundAt={effectiveLastInboundAt}
                  onSendTemplate={() => setTemplateDialogOpen(true)}
                />
                <ConsumptionBadge
                  conversationId={conversa.id}
                  lastInboundAt={effectiveLastInboundAt}
                />
                {/* Channel badge */}
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] h-5 gap-1 px-1.5 font-medium border-border/20",
                    channel === "evolution"
                      ? "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5"
                      : channel === "web_manual_team"
                        ? "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5"
                        : "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5"
                  )}
                >
                  {channel === "evolution" ? <Globe className="h-3 w-3" /> : channel === "web_manual_team" ? <Globe className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                  {channel === "evolution" ? "WhatsApp Web" : channel === "web_manual_team" ? "Web Manual" : "Oficial"}
                </Badge>
              </div>
              {ci.subtitle && (
                <p className="text-[12px] text-primary/70 truncate">{ci.subtitle}</p>
              )}
              <p className={cn(
                "text-[11px] font-medium",
                QUEUE_STATUS_LABELS[conversa.queueStatus ?? ""]?.color ?? "text-muted-foreground/40"
              )}>
                {QUEUE_STATUS_LABELS[conversa.queueStatus ?? ""]?.label ?? conversa.status}
                {conversa.atendente && <span className="text-muted-foreground/50 font-normal"> · {conversa.atendente}</span>}
              </p>
            </div>
          );
        })()}

        {/* Right: IA + ⋯ menu + CRM toggle */}
        <div className="flex items-center gap-0.5">
          {/* IA button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 gap-1.5 rounded-lg text-xs text-muted-foreground/60 hover:text-primary">
                {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                <span className="hidden lg:inline text-[12px]">IA</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1" align="end">
              <button className="w-full flex items-center gap-2 px-2.5 py-2 text-xs hover:bg-muted/30 rounded-lg transition-colors disabled:opacity-50" onClick={() => handleAiAction("suggest")} disabled={!!aiLoading}>
                <Brain className="h-3.5 w-3.5 text-muted-foreground/50" /> Sugerir resposta
              </button>
              <button className="w-full flex items-center gap-2 px-2.5 py-2 text-xs hover:bg-muted/30 rounded-lg transition-colors disabled:opacity-50" onClick={() => handleAiAction("summarize")} disabled={!!aiLoading}>
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground/50" /> Resumir caso
              </button>
              <button className="w-full flex items-center gap-2 px-2.5 py-2 text-xs hover:bg-muted/30 rounded-lg transition-colors disabled:opacity-50" onClick={() => handleAiAction("extract")} disabled={!!aiLoading}>
                <Database className="h-3.5 w-3.5 text-muted-foreground/50" /> Extrair dados
              </button>
              <button className="w-full flex items-center gap-2 px-2.5 py-2 text-xs hover:bg-muted/30 rounded-lg transition-colors disabled:opacity-50" onClick={() => handleAiAction("next_action")} disabled={!!aiLoading}>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" /> Próxima ação
              </button>
            </PopoverContent>
          </Popover>

          {/* ⋯ Actions menu — all secondary actions consolidated here */}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-muted-foreground/50">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="end">
              {conversa.queueStatus === "encerrado" && onReopen ? (
                <button className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs hover:bg-muted/30 rounded-lg transition-colors text-emerald-600 dark:text-emerald-400" onClick={onReopen}>
                  <RotateCw className="h-3.5 w-3.5" /> Reabrir conversa
                </button>
              ) : (
                <button className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs hover:bg-muted/30 rounded-lg transition-colors disabled:opacity-40" onClick={onAssume} disabled={conversa.assignedAgentId === currentUserId}>
                  <UserCheck className="h-3.5 w-3.5" /> Assumir conversa
                </button>
              )}
              {onTransfer && (
                <button className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs hover:bg-muted/30 rounded-lg transition-colors" onClick={onTransfer}>
                  <ArrowRightLeft className="h-3.5 w-3.5" /> Transferir
                </button>
              )}
              <button className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs hover:bg-muted/30 rounded-lg transition-colors" onClick={onPendente}>
                <Clock className="h-3.5 w-3.5" /> Marcar pendente
              </button>

              {/* Channel transfer */}
              {onChangeChannel && (
                channel === "official" ? (
                  <button className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs hover:bg-muted/30 rounded-lg transition-colors text-amber-600 dark:text-amber-400" onClick={() => onTransferToWeb?.()}>
                    <Globe className="h-3.5 w-3.5" /> Transferir para Web (Manual)
                  </button>
                ) : (
                  <button className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs hover:bg-muted/30 rounded-lg transition-colors text-emerald-600 dark:text-emerald-400" onClick={() => onChangeChannel("official")}>
                    <Smartphone className="h-3.5 w-3.5" /> Voltar para Oficial
                  </button>
                )
              )}

              {/* AI toggle */}
              {onToggleAi && (
                <button
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 text-xs hover:bg-muted/30 rounded-lg transition-colors",
                    aiEnabled ? "text-primary" : "text-muted-foreground/70"
                  )}
                  onClick={onToggleAi}
                >
                  <Bot className="h-3.5 w-3.5" />
                  {aiEnabled ? "Desativar IA automática" : "Ativar IA automática"}
                </button>
              )}

              {/* AI Agent selector */}
              {aiEnabled && onChangeAiAgent && aiAgents.length > 0 && (
                <div className="px-2.5 py-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/35 mb-1">Agente IA</p>
                  <button
                    className={cn("w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition-colors", !selectedAiAgentId ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/30 text-muted-foreground/70")}
                    onClick={() => onChangeAiAgent(null)}
                  >
                    Padrão
                  </button>
                  {aiAgents.map(a => (
                    <button
                      key={a.id}
                      className={cn("w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition-colors", selectedAiAgentId === a.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/30 text-muted-foreground/70")}
                      onClick={() => onChangeAiAgent(a.id)}
                    >
                      {a.name} <span className="text-[9px] text-muted-foreground/40">{a.model}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="h-px bg-border/10 my-1" />

              {/* Etiquetas sub-section */}
              <div className="px-2.5 py-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/35 mb-1">Etiquetas</p>
                {ETIQUETAS_OPTIONS.map((e) => (
                  <label key={e} className="flex items-center gap-2 py-1.5 cursor-pointer text-xs hover:text-foreground text-muted-foreground/70">
                    <Checkbox checked={conversa.etiquetas.includes(e)} onCheckedChange={() => onToggleEtiqueta(e)} className="h-3.5 w-3.5" />
                    {e}
                  </label>
                ))}
              </div>

              <div className="h-px bg-border/10 my-1" />

              {/* Sound */}
              {onToggleSound && (
                <button className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs hover:bg-muted/30 rounded-lg transition-colors" onClick={onToggleSound}>
                  {soundEnabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                  {soundEnabled ? "Desativar som" : "Ativar som"}
                </button>
              )}

              {/* Connection */}
              {connectionStatus !== "connected" && onReconnect && (
                <button className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs hover:bg-muted/30 rounded-lg transition-colors text-destructive/70" onClick={onReconnect}>
                  <WifiOff className="h-3.5 w-3.5" /> Reconectar
                </button>
              )}

              <div className="h-px bg-border/10 my-1" />

              <button className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs hover:bg-muted/30 rounded-lg transition-colors text-destructive/70" onClick={onFinalizar}>
                <CheckCircle className="h-3.5 w-3.5" /> Encerrar atendimento
              </button>
            </PopoverContent>
          </Popover>

          {/* CRM panel toggle */}
          {onToggleContext && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-muted-foreground/40" onClick={onToggleContext}>
                    {isMobile ? (
                      <Info className="h-4 w-4" />
                    ) : showContext ? (
                      <PanelRightClose className="h-4 w-4" />
                    ) : (
                      <PanelRightOpen className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  {isMobile ? "Contexto CRM" : showContext ? "Modo foco" : "Contexto CRM"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* AI Result banner */}
      {(summary || aiResult) && (
        <div className="mx-4 mt-2 p-3 bg-primary/5 border border-primary/10 rounded-xl relative animate-in fade-in slide-in-from-top-1 duration-200">
          <button
            onClick={() => { setSummary(null); setAiResult(null); }}
            className="absolute top-2 right-2 text-muted-foreground/30 hover:text-foreground text-xs"
          >
            ✕
          </button>
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/60">
              {summary ? "Resumo IA" : aiResult?.type === "extract" ? "Dados Extraídos" : aiResult?.type === "next_action" ? "Próxima Ação" : "IA"}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-foreground/70 whitespace-pre-line pr-6">
            {summary || aiResult?.text}
          </p>
          {aiResult?.type === "next_action" && (
            <Button size="sm" variant="outline" className="mt-2 h-7 text-xs rounded-lg" onClick={() => { toast({ title: "Ação aplicada ✅" }); setAiResult(null); }}>
              Aplicar
            </Button>
          )}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 w-full overflow-x-hidden bg-chat-bg" ref={(node) => {
        // Get the Radix viewport element inside ScrollArea
        if (node) {
          const viewport = node.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
          if (viewport) scrollViewportRef.current = viewport;
        }
      }}>
        <div className="px-4 md:px-8 py-3 space-y-0.5 max-w-3xl mx-auto w-full overflow-x-hidden">
          {hasMore && (
            <div className="flex justify-center py-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground/40 hover:text-foreground"
                onClick={() => setVisibleCount((v) => v + MESSAGES_PER_PAGE)}
              >
                Carregar mais ({mensagens.length - visibleCount} anteriores)
              </Button>
            </div>
          )}

          {/* Pinned messages bar */}
          {(() => {
            const pinnedMsgs = mensagens.filter((m) => pinnedIds.has(m.id));
            if (pinnedMsgs.length === 0) return null;
            return (
              <div className="mx-auto w-full max-w-3xl mb-2">
                <div className="bg-muted/10 rounded-lg p-2 flex items-center gap-2">
                  <Pin className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                  <span className="text-[11px] text-muted-foreground/50">{pinnedMsgs.length} fixada{pinnedMsgs.length > 1 ? "s" : ""}</span>
                  <p className="text-[11px] text-muted-foreground/35 truncate flex-1">{pinnedMsgs[pinnedMsgs.length - 1]?.texto}</p>
                </div>
              </div>
            );
          })()}

          {/* Favorites filter */}
          {favoritedIds.size > 0 && (
            <div className="flex justify-center mb-2">
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={cn(
                  "flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full transition-all",
                  showFavoritesOnly
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground/40 hover:text-foreground"
                )}
              >
                <Star className="h-3 w-3" />
                {showFavoritesOnly ? "Mostrando favoritas" : `${favoritedIds.size} favorita${favoritedIds.size > 1 ? "s" : ""}`}
              </button>
            </div>
          )}

          {isLoadingMessages ? (
            <MessageSkeleton />
          ) : (
            messageGroups.map((group) => (
              <div key={group.label}>
                <div className="flex items-center justify-center my-4">
                  <span className="text-[10px] font-medium text-muted-foreground/30 bg-muted/10 px-3 py-1 rounded-full">
                    {group.label}
                  </span>
                </div>

                {(() => {
                  const filtered = group.messages.filter((m) => !showFavoritesOnly || favoritedIds.has(m.id));
                  // Collect unique agent ids to decide if we need author labels
                  const agentIds = new Set(filtered.filter(m => m.de === "atendente").map(m => m.sentByAgentId).filter(Boolean));
                  const multiAgent = agentIds.size > 1;

                  return filtered.map((m, idx) => {
                    const prev = idx > 0 ? filtered[idx - 1] : null;
                    const next = idx < filtered.length - 1 ? filtered[idx + 1] : null;
                    const position = getBubblePosition(m, prev, next);
                    const showTime = shouldShowTimestamp(m, prev);
                    const isMe = m.de === "atendente";
                    // Show avatar on last msg of block (or solo)
                    const showAvatar = position === "last" || position === "solo";
                    // Show author label on first msg of block when multiple agents
                    const showAuthorLabel = multiAgent && (position === "first" || position === "solo");

                    const eventsBeforeThis = conversationEvents.filter((ev) => {
                      const evTime = new Date(ev.created_at).getTime();
                      const prevTime = prev ? prev.horario.getTime() : 0;
                      const currTime = m.horario.getTime();
                      return evTime > prevTime && evTime <= currTime;
                    });

                    return (
                      <div key={m.id}>
                        {eventsBeforeThis.map((ev) => (
                          <InlineEvent key={ev.id} event={ev} profileMap={profileMap} />
                        ))}
                        <MessageContextMenu
                          message={m}
                          isMe={isMe}
                          isMobile={isMobile}
                          onReply={setReplyTo}
                          onPin={handlePin}
                          onFavorite={handleFavorite}
                          onDelete={handleDeleteMessage}
                          isPinned={pinnedIds.has(m.id)}
                          isFavorited={favoritedIds.has(m.id)}
                        >
                          <div className="relative">
                            {(pinnedIds.has(m.id) || favoritedIds.has(m.id)) && (
                              <div className={cn("absolute -top-1 z-10 flex gap-0.5", isMe ? "right-10" : "left-10")}>
                                {pinnedIds.has(m.id) && <Pin className="h-2.5 w-2.5 text-muted-foreground/30" />}
                                {favoritedIds.has(m.id) && <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />}
                              </div>
                            )}
                            <MessageBubble
                              message={m}
                              position={position}
                              showTime={showTime}
                              showAuthorLabel={showAuthorLabel}
                              showAvatar={showAvatar}
                              onRetry={onRetry ? (msg) => onRetry(msg.id, msg.texto, msg.msgType, msg.mediaUrl ?? undefined, msg.mediaMime ?? undefined, msg.mediaFilename ?? undefined) : undefined}
                              currentUserId={currentUserId}
                              onEditMessage={onEditMessage}
                              profileMap={profileMap}
                            />
                          </div>
                        </MessageContextMenu>
                      </div>
                    );
                  });
                })()}
                {(() => {
                  const lastMsgTime = group.messages[group.messages.length - 1]?.horario.getTime() ?? 0;
                  const trailingEvents = conversationEvents.filter((ev) => new Date(ev.created_at).getTime() > lastMsgTime);
                  return trailingEvents.map((ev) => <InlineEvent key={ev.id} event={ev} profileMap={profileMap} />);
                })()}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* ── Composer ── Clean, no chips */}
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

        {/* Agent notes input (web_manual_team mode) */}
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
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs shrink-0"
                onClick={handleSaveAgentNote}
                disabled={!agentNote.trim() || savingNote}
              >
                <Send className="h-3 w-3" />
                Salvar
              </Button>
            </div>
          </div>
        )}

        {/* Window closed banner */}
        {!windowStatus.isOpen && (
          <div className="mx-4 mt-2 mb-1 p-2.5 bg-destructive/5 border border-destructive/10 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
            <Lock className="h-4 w-4 text-destructive/60 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-destructive/80">Janela de 24h fechada</p>
              <p className="text-[10px] text-destructive/50">Envie um template aprovado para retomar a conversa</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 text-xs h-7 gap-1 border-destructive/20 text-destructive/70 hover:bg-destructive/5"
              onClick={() => setTemplateDialogOpen(true)}
            >
              <MessageSquareText className="h-3 w-3" />
              Enviar Template
            </Button>
          </div>
        )}

        {/* Quick replies */}
        {showQuickReplies && (
          <div className="absolute bottom-full left-0 right-0 mx-4 mb-1.5 bg-popover border border-border/20 rounded-xl shadow-lg max-h-[200px] overflow-y-auto z-50">
            {filteredReplies.map((r, i) => (
              <button
                key={r.id}
                className={cn(
                  "w-full text-left px-3 py-2.5 text-xs hover:bg-muted/20 transition-colors first:rounded-t-xl last:rounded-b-xl",
                  i === quickReplyIndex && "bg-muted/20"
                )}
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
            <Button size="icon" variant="ghost" className="h-6 w-6 rounded-lg shrink-0" onClick={() => setReplyTo(null)}>
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
              <div className="h-14 w-14 rounded-lg bg-muted/20 flex items-center justify-center">
                <Mic className="h-5 w-5 text-muted-foreground/50" />
              </div>
            ) : (
              <div className="h-14 w-14 rounded-lg bg-muted/20 flex items-center justify-center">
                <FileText className="h-5 w-5 text-muted-foreground/50" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{pendingFile.name}</p>
              <p className="text-[10px] text-muted-foreground/40">
                {(pendingFile.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-lg shrink-0"
              onClick={() => { setPendingFile(null); setPendingPreview(null); }}
            >
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
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 rounded-lg text-muted-foreground/30 hover:text-muted-foreground/60"
                    onClick={() => setTemplateDialogOpen(true)}
                  >
                    <MessageSquareText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Enviar Template</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Textarea
            ref={textareaRef}
            placeholder={!windowStatus.isOpen ? "Janela fechada — use um template" : pendingFile ? "Legenda (opcional)..." : "Mensagem..."}
            value={msgText}
            onChange={(e) => {
              handleAutoCorrect(e.target.value, msgText);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKeyDown}
            disabled={!windowStatus.isOpen}
            spellCheck={true}
            autoComplete="off"
            autoCapitalize="sentences"
            lang="pt-BR"
            className={cn(
              "min-h-[42px] max-h-[120px] resize-none text-[14px] flex-1 rounded-xl bg-muted/10 border-border/10 focus-visible:border-primary/20 focus-visible:bg-background transition-all",
              !windowStatus.isOpen && "opacity-50 cursor-not-allowed"
            )}
            rows={1}
          />

          {!msgText.trim() && !pendingFile ? (
            <AudioRecorder
              onSendAudio={(file) => {
                if (onSendMedia) onSendMedia(file);
              }}
            />
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
              disabled={(!msgText.trim() && !pendingFile) || !windowStatus.isOpen}
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

      {/* Template Dialog */}
      {conversationPhone && (
        <SendTemplateDialog
          open={templateDialogOpen}
          onOpenChange={setTemplateDialogOpen}
          conversationId={conversa.id}
          phone={conversationPhone}
          waName={conversa.waName}
        />
      )}
    </div>
  );
}