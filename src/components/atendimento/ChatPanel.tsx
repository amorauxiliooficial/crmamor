import { useRef, useEffect, useState, useMemo, useCallback, memo } from "react";
import {
  Send, ArrowLeft, User, UserCheck, Clock, CheckCircle, Tag,
  FileText, Sparkles, Mic, PanelRightOpen, PanelRightClose,
  Loader2, Zap, Brain, Database, ArrowRight, CalendarPlus, AlertTriangle,
  Info, Paperclip, X, Image as ImageIcon, RotateCcw, MoreVertical, Pencil, Check,
  Bell, BellOff, ArrowRightLeft, RefreshCw, Wifi, WifiOff, RotateCw,
} from "lucide-react";
import { AudioRecorder } from "@/components/atendimento/AudioRecorder";
import { MessageStatusIcon } from "@/components/atendimento/MessageStatusIcon";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { smartTemplates, type SmartTemplate } from "@/data/smartTemplates";
import { MediaBubble } from "@/components/atendimento/MediaBubble";
import type { Conversa, Mensagem } from "@/data/atendimentoMock";
import type { RespostaRapida } from "@/data/respostasRapidas";
import type { ConversationEvent } from "@/hooks/useConversationEvents";
import type { ConnectionStatus } from "@/hooks/useRealtimeConnection";

const STATUS_COLORS: Record<string, string> = {
  Aberto: "bg-emerald-500",
  Pendente: "bg-amber-500",
  Fechado: "bg-muted-foreground/40",
};

const QUEUE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  sem_responsavel: { label: "Sem responsável", color: "text-destructive" },
  em_atendimento: { label: "Em atendimento", color: "text-emerald-600 dark:text-emerald-400" },
  aguardando_cliente: { label: "Aguardando cliente", color: "text-amber-600 dark:text-amber-400" },
  resolvido: { label: "Resolvido", color: "text-muted-foreground" },
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
  return current.de === prev.de && current.horario.getTime() - prev.horario.getTime() < 2 * 60000;
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

// Edit time limit in minutes
const EDIT_TIME_LIMIT_MIN = 15;

// Memoized message bubble to prevent re-renders when typing
const MessageBubble = memo(function MessageBubble({
  message: m,
  isGrouped,
  showTime,
  onRetry,
  currentUserId,
  onEditMessage,
}: {
  message: Mensagem;
  isGrouped: boolean;
  showTime: boolean;
  onRetry?: (m: Mensagem) => void;
  currentUserId?: string | null;
  onEditMessage?: (messageId: string, newBody: string) => void;
}) {
  const isMe = m.de === "atendente";
  const isMedia = m.msgType && m.msgType !== "text";
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

  return (
    <div
      className={cn(
        "flex w-full min-w-0 overflow-hidden group",
        isMe ? "justify-end" : "justify-start",
        isGrouped ? "mt-0.5" : "mt-2"
      )}
    >
      <div className={cn("max-w-[85%] sm:max-w-[75%] overflow-hidden min-w-0", isMe ? "items-end" : "items-start")}>
        {/* Agent name for outbound */}
        {isMe && m.sentByAgentName && !isGrouped && (
          <p className="text-[10px] text-primary/50 font-medium mb-0.5 text-right px-1.5">
            {m.sentByAgentName}
          </p>
        )}

        {editing ? (
          <div className="flex flex-col gap-1.5 w-full min-w-[200px]">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="text-[15px] leading-relaxed p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-foreground resize-none min-h-[44px] focus:outline-none focus:ring-1 focus:ring-primary/30"
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
            {/* Edit menu trigger */}
            {canEdit && onEditMessage && (
              <div className={cn(
                "absolute z-10",
                isMe ? "right-1 top-1" : "left-1 top-1",
                "opacity-100 transition-opacity"
              )}>
                <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                  <PopoverTrigger asChild>
                    <button className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted/30 text-muted-foreground/40 hover:text-muted-foreground transition-colors">
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
                "py-2.5 overflow-hidden break-words min-w-0",
                isMedia ? "px-1" : "px-3.5",
                isMe
                  ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                  : "bg-card border border-border/20 rounded-2xl rounded-bl-sm",
                isFailed && "ring-1 ring-destructive/30"
              )}
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
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere px-0.5" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {/^\[.+\]$/.test(m.texto.trim()) ? "" : m.texto}
                </p>
              )}
            </div>
          </div>
        )}
        {/* Status + timestamp + edited indicator */}
        <div className={cn(
          "flex items-center gap-1 mt-0.5 px-1.5",
          isMe ? "justify-end" : ""
        )}>
          {m.editedAt && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[9px] text-muted-foreground/40 italic">editada</span>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  Editada em {new Date(m.editedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {showTime && (
            <span className="text-[10px] text-muted-foreground/40">
              {m.horario.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {isMe && (
            <MessageStatusIcon
              status={m.status}
              errorMessage={m.errorMessage}
            />
          )}
        </div>
        {/* Retry button for failed messages */}
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
};

function InlineEvent({ event, profileMap }: { event: ConversationEvent; profileMap?: Map<string, string> }) {
  const info = EVENT_LABELS[event.event_type] || { icon: "📌", label: event.event_type };
  const agentName = event.created_by_agent_id && profileMap ? profileMap.get(event.created_by_agent_id) ?? "Agente" : "Sistema";
  const toAgent = event.to_agent_id && profileMap ? profileMap.get(event.to_agent_id) : null;
  const reason = (event.meta as any)?.reason;

  return (
    <div className="flex items-center justify-center my-2">
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/20 border border-border/10 text-[11px] text-muted-foreground/60 max-w-[80%]">
        <span>{info.icon}</span>
        <span className="font-medium">{agentName}</span>
        <span>{info.label}</span>
        {toAgent && <span>para <span className="font-medium">{toAgent}</span></span>}
        {reason && <span className="italic truncate max-w-[120px]">• {reason}</span>}
        <span className="text-muted-foreground/30 ml-1">
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
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplyIndex, setQuickReplyIndex] = useState(0);
  const [aiLoading, setAiLoading] = useState<AiAction | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{ type: AiAction; text: string } | null>(null);
  const [visibleCount, setVisibleCount] = useState(MESSAGES_PER_PAGE);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversa?.id, mensagens.length]);

  useEffect(() => {
    setSummary(null);
    setAiResult(null);
    setVisibleCount(MESSAGES_PER_PAGE);
  }, [conversa?.id]);

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

  const handleSmartTemplate = useCallback((template: SmartTemplate) => {
    onMsgTextChange(template.texto);
    textareaRef.current?.focus();
    if (template.actions) {
      const actionLabels: string[] = [];
      if (template.actions.createFollowUp) actionLabels.push("📅 Follow-up");
      if (template.actions.timelineEvent) actionLabels.push("📝 Timeline");
      if (template.actions.updateChecklist) actionLabels.push("✅ Checklist");
      if (actionLabels.length > 0) {
        toast({ title: "Ações vinculadas", description: actionLabels.join(" • ") });
      }
    }
  }, [onMsgTextChange, toast]);

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
        <div className="h-14 w-14 rounded-2xl bg-muted/20 flex items-center justify-center">
          <MessageSquare className="h-6 w-6 text-muted-foreground/25" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-muted-foreground/60">Selecione uma conversa</p>
          <p className="text-xs text-muted-foreground/35">⌘K para buscar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 w-full overflow-x-hidden bg-background">
      {/* Header */}
      <div className="border-b border-border/20 px-4 py-3 flex items-center gap-3 shrink-0 bg-card/30 backdrop-blur-sm">
        {isMobile && (
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
            {conversa.nome ? conversa.nome.charAt(0) : <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-[15px] truncate">{conversa.nome ?? conversa.telefone}</p>
            {conversa.queueStatus && (
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-medium rounded-full border-border/30", QUEUE_STATUS_LABELS[conversa.queueStatus]?.color)}>
                {QUEUE_STATUS_LABELS[conversa.queueStatus]?.label}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {conversa.nome && <p className="text-xs text-muted-foreground/50 font-mono">{conversa.telefone}</p>}
            {conversa.atendente ? (
              <p className="text-xs text-primary/60 font-medium">• com {conversa.atendente}</p>
            ) : (
              <p className="text-xs text-destructive/60 font-medium">• Sem responsável</p>
            )}
          {conversa.slaMinutos != null && conversa.status !== "Fechado" && (
              <span className={cn(
                "text-[11px] font-mono tabular-nums",
                (conversa.slaMinutos ?? 0) > 30 ? "text-destructive/70" : "text-muted-foreground/40"
              )}>
                SLA: {conversa.slaMinutos}m
              </span>
            )}
            {/* Connection indicator */}
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px] font-medium",
              connectionStatus === "connected" ? "text-emerald-500" : connectionStatus === "connecting" ? "text-amber-500" : "text-destructive"
            )}>
              {connectionStatus === "connected" ? (
                <><Wifi className="h-3 w-3" /> Conectado</>
              ) : connectionStatus === "connecting" ? (
                <><RefreshCw className="h-3 w-3 animate-spin" /> Conectando...</>
              ) : (
                <button onClick={onReconnect} className="inline-flex items-center gap-1 hover:underline">
                  <WifiOff className="h-3 w-3" /> Reconectar
                </button>
              )}
            </span>
          </div>
        </div>

        {/* Actions */}
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-1">
            {/* AI Actions dropdown */}
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="ghost" className="h-9 gap-1.5 rounded-lg text-xs text-primary/70 hover:text-primary">
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span className="hidden lg:inline">IA</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1.5" align="end">
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs hover:bg-accent/30 rounded-lg transition-colors disabled:opacity-50 min-h-[40px]"
                  onClick={() => handleAiAction("suggest")}
                  disabled={!!aiLoading}
                >
                  <Brain className="h-4 w-4 text-primary/70" /> Sugerir resposta
                </button>
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs hover:bg-accent/30 rounded-lg transition-colors disabled:opacity-50 min-h-[40px]"
                  onClick={() => handleAiAction("summarize")}
                  disabled={!!aiLoading}
                >
                  <Sparkles className="h-4 w-4 text-primary/70" /> Resumir caso
                </button>
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs hover:bg-accent/30 rounded-lg transition-colors disabled:opacity-50 min-h-[40px]"
                  onClick={() => handleAiAction("extract")}
                  disabled={!!aiLoading}
                >
                  <Database className="h-4 w-4 text-primary/70" /> Extrair dados
                </button>
                <button
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs hover:bg-accent/30 rounded-lg transition-colors disabled:opacity-50 min-h-[40px]"
                  onClick={() => handleAiAction("next_action")}
                  disabled={!!aiLoading}
                >
                  <ArrowRight className="h-4 w-4 text-primary/70" /> Próxima ação
                </button>
              </PopoverContent>
            </Popover>

            {!isMobile && (
              <>
                {conversa.queueStatus === "resolvido" && onReopen ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg text-emerald-600" onClick={onReopen}>
                        <RotateCw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">Reabrir</TooltipContent>
                  </Tooltip>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-lg text-muted-foreground/60"
                        onClick={onAssume}
                        disabled={conversa.assignedAgentId === currentUserId}
                      >
                        <UserCheck className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">Assumir</TooltipContent>
                  </Tooltip>
                )}

                {onTransfer && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg text-muted-foreground/60" onClick={onTransfer}>
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">Transferir</TooltipContent>
                  </Tooltip>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg text-muted-foreground/60" onClick={onPendente}>
                      <Clock className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">Pendente</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg text-muted-foreground/60" onClick={onFinalizar}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">Encerrar</TooltipContent>
                </Tooltip>
              </>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg text-muted-foreground/60">
                  <Tag className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1.5" align="end">
                {ETIQUETAS_OPTIONS.map((e) => (
                  <label key={e} className="flex items-center gap-2.5 py-2 px-2.5 hover:bg-accent/30 rounded-lg cursor-pointer text-xs min-h-[40px]">
                    <Checkbox checked={conversa.etiquetas.includes(e)} onCheckedChange={() => onToggleEtiqueta(e)} className="h-4 w-4" />
                    {e}
                  </label>
                ))}
              </PopoverContent>
            </Popover>

            {/* Sound toggle */}
            {onToggleSound && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-9 w-9 rounded-lg",
                      soundEnabled ? "text-primary/70" : "text-muted-foreground/40"
                    )}
                    onClick={onToggleSound}
                  >
                    {soundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  {autoplayBlocked
                    ? "Clique para ativar som"
                    : soundEnabled
                      ? "Desativar som"
                      : "Ativar som"}
                </TooltipContent>
              </Tooltip>
            )}

            {onToggleContext && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg text-muted-foreground/60" onClick={onToggleContext}>
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
            )}
          </div>
        </TooltipProvider>
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
            <Button size="sm" variant="outline" className="mt-2 h-8 text-xs rounded-lg" onClick={() => { toast({ title: "Ação aplicada ✅" }); setAiResult(null); }}>
              Aplicar
            </Button>
          )}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 w-full overflow-x-hidden">
        <div className="px-4 md:px-6 py-3 space-y-1 max-w-3xl mx-auto w-full overflow-x-hidden">
          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center py-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-muted-foreground/50 hover:text-foreground"
                onClick={() => setVisibleCount((v) => v + MESSAGES_PER_PAGE)}
              >
                Carregar mais mensagens ({mensagens.length - visibleCount} anteriores)
              </Button>
            </div>
          )}

          {isLoadingMessages ? (
            <MessageSkeleton />
          ) : (
            messageGroups.map((group) => (
              <div key={group.label}>
                <div className="flex items-center justify-center my-3">
                  <span className="text-[10px] font-medium text-muted-foreground/40 bg-muted/15 px-3 py-1 rounded-full">
                    {group.label}
                  </span>
                </div>

                {group.messages.map((m, idx) => {
                  const prev = idx > 0 ? group.messages[idx - 1] : null;
                  const isGrouped = isSameAuthorGroup(m, prev);
                  const showTime = shouldShowTimestamp(m, prev);

                  return (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      isGrouped={isGrouped}
                      showTime={showTime}
                      onRetry={onRetry ? (msg) => onRetry(msg.id, msg.texto, msg.msgType, msg.mediaUrl ?? undefined, msg.mediaMime ?? undefined, msg.mediaFilename ?? undefined) : undefined}
                      currentUserId={currentUserId}
                      onEditMessage={onEditMessage}
                    />
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="relative border-t border-border/20 bg-card/20 backdrop-blur-sm w-full overflow-x-hidden">
        {/* Quick replies */}
        {showQuickReplies && (
          <div className="absolute bottom-full left-0 right-0 mx-4 mb-1.5 bg-popover border border-border/30 rounded-xl shadow-lg max-h-[200px] overflow-y-auto z-50">
            {filteredReplies.map((r, i) => (
              <button
                key={r.id}
                className={cn(
                  "w-full text-left px-3 py-2.5 text-xs hover:bg-accent/30 transition-colors first:rounded-t-xl last:rounded-b-xl min-h-[40px]",
                  i === quickReplyIndex && "bg-accent/30"
                )}
                onMouseDown={(e) => { e.preventDefault(); selectQuickReply(r.texto); }}
              >
                <span className="font-medium text-primary text-[11px]">/{r.atalho}</span>
                <span className="ml-2 text-muted-foreground/50 text-[11px]">{r.titulo}</span>
              </button>
            ))}
          </div>
        )}

        {/* Template + Action chips - scrollable on mobile */}
        <div className="flex gap-1.5 px-4 pt-2 pb-1 overflow-x-auto scrollbar-none">
          {smartTemplates.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSmartTemplate(t)}
              className="shrink-0 flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-full border border-border/15 text-muted-foreground/50 hover:text-foreground hover:border-primary/20 hover:bg-primary/5 transition-all min-h-[32px]"
            >
              <span>{t.emoji}</span>
              <span>{t.label}</span>
              {t.actions && <Zap className="h-2.5 w-2.5 text-primary/40" />}
            </button>
          ))}
          <div className="w-px bg-border/20 mx-1 shrink-0" />
          <button
            onClick={() => { toast({ title: "Follow-up 24h criado 📅" }); }}
            className="shrink-0 flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-full border border-primary/15 text-primary/50 hover:text-primary hover:bg-primary/5 transition-all min-h-[32px]"
          >
            <CalendarPlus className="h-3 w-3" /> 24h
          </button>
          <button
            onClick={() => { toast({ title: "Follow-up 48h criado 📅" }); }}
            className="shrink-0 flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-full border border-primary/15 text-primary/50 hover:text-primary hover:bg-primary/5 transition-all min-h-[32px]"
          >
            <CalendarPlus className="h-3 w-3" /> 48h
          </button>
          <button
            onClick={onPendente}
            className="shrink-0 flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-full border border-amber-500/15 text-amber-600/50 dark:text-amber-400/50 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/5 transition-all min-h-[32px]"
          >
            <Clock className="h-3 w-3" /> Pendente
          </button>
          <button
            onClick={() => onToggleEtiqueta("Urgente")}
            className="shrink-0 flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-full border border-destructive/15 text-destructive/50 hover:text-destructive hover:bg-destructive/5 transition-all min-h-[32px]"
          >
            <AlertTriangle className="h-3 w-3" /> Urgente
          </button>
        </div>

        {/* Pending file preview */}
        {pendingFile && pendingPreview && (
          <div className="mx-4 mt-2 mb-1 p-2 bg-muted/20 border border-border/20 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
            {pendingFile.type.startsWith("image/") ? (
              <img src={pendingPreview} alt="Preview" className="h-16 w-16 rounded-lg object-cover" />
            ) : pendingFile.type.startsWith("video/") ? (
              <video src={pendingPreview} className="h-16 w-16 rounded-lg object-cover" muted />
            ) : pendingFile.type.startsWith("audio/") ? (
              <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mic className="h-6 w-6 text-primary" />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{pendingFile.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {(pendingFile.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-lg shrink-0"
              onClick={() => { setPendingFile(null); setPendingPreview(null); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex gap-2 items-end px-4 pb-3 pt-1.5">
          <div className="flex gap-1 shrink-0">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 rounded-lg text-muted-foreground/40"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Anexar arquivo</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 rounded-lg text-muted-foreground/40"
                    onClick={() => onMsgTextChange(msgText.startsWith("/") ? msgText : "/")}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Templates (/)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setPendingFile(file);
                if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
                  setPendingPreview(URL.createObjectURL(file));
                } else {
                  setPendingPreview("file");
                }
                e.target.value = "";
              }}
            />
          </div>

          <Textarea
            ref={textareaRef}
            placeholder={pendingFile ? "Legenda (opcional)..." : "Mensagem..."}
            value={msgText}
            onChange={(e) => {
              onMsgTextChange(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleKeyDown}
            className="min-h-[44px] max-h-[120px] resize-none text-[15px] flex-1 rounded-xl bg-muted/15 border-border/15 focus-visible:border-primary/25 focus-visible:bg-background transition-all"
            rows={1}
          />

          {/* Show mic button when no text, send button when there is text/file */}
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
              disabled={!msgText.trim() && !pendingFile}
              className="shrink-0 rounded-xl h-11 w-11"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>

        {!isMobile && (
          <div className="text-center pb-1">
            <span className="text-[9px] text-muted-foreground/30">Enter envia • Shift+Enter nova linha • / templates • ⌘K buscar</span>
          </div>
        )}
      </div>
    </div>
  );
}
