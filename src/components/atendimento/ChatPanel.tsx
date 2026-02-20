import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import {
  Send, ArrowLeft, User, UserCheck, Clock, CheckCircle, Tag,
  FileText, Sparkles, Mic, PanelRightOpen, PanelRightClose,
  Loader2, Zap, Brain, Database, ArrowRight, CalendarPlus, AlertTriangle,
} from "lucide-react";
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
import type { Conversa, Mensagem } from "@/data/atendimentoMock";
import type { RespostaRapida } from "@/data/respostasRapidas";

const STATUS_COLORS: Record<string, string> = {
  Aberto: "bg-emerald-500",
  Pendente: "bg-amber-500",
  Fechado: "bg-muted-foreground/40",
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
    <div className="px-4 py-3 space-y-3 max-w-2xl mx-auto">
      {[1, 2, 3].map((i) => (
        <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
          <div className="space-y-1">
            <Skeleton className={cn("h-8 rounded-2xl", i % 2 === 0 ? "w-48" : "w-56")} />
            <Skeleton className="h-2 w-10" />
          </div>
        </div>
      ))}
    </div>
  );
}

type AiAction = "suggest" | "summarize" | "extract" | "next_action";

interface ChatPanelProps {
  conversa: Conversa | null;
  mensagens: Mensagem[];
  isMobile: boolean;
  msgText: string;
  onMsgTextChange: (v: string) => void;
  onSend: () => void;
  onBack: () => void;
  onAssume: () => void;
  onPendente: () => void;
  onFinalizar: () => void;
  onToggleEtiqueta: (e: string) => void;
  respostas: RespostaRapida[];
  showContext?: boolean;
  onToggleContext?: () => void;
  isLoadingMessages?: boolean;
}

export function ChatPanel({
  conversa,
  mensagens,
  isMobile,
  msgText,
  onMsgTextChange,
  onSend,
  onBack,
  onAssume,
  onPendente,
  onFinalizar,
  onToggleEtiqueta,
  respostas,
  showContext,
  onToggleContext,
  isLoadingMessages = false,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplyIndex, setQuickReplyIndex] = useState(0);
  const [aiLoading, setAiLoading] = useState<AiAction | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{ type: AiAction; text: string } | null>(null);
  const [visibleCount, setVisibleCount] = useState(MESSAGES_PER_PAGE);
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
      <div className="flex-1 flex flex-col items-center justify-center gap-3 h-full bg-background">
        <div className="h-12 w-12 rounded-2xl bg-muted/20 flex items-center justify-center">
          <MessageSquare className="h-5 w-5 text-muted-foreground/25" />
        </div>
        <div className="text-center space-y-0.5">
          <p className="text-sm font-medium text-muted-foreground/60">Selecione uma conversa</p>
          <p className="text-[10px] text-muted-foreground/35">⌘K para buscar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-background">
      {/* Header */}
      <div className="border-b border-border/20 px-3 py-2 flex items-center gap-2.5 shrink-0 bg-card/30 backdrop-blur-sm">
        {isMobile && (
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
        )}

        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className="text-[9px] font-semibold bg-primary/10 text-primary">
            {conversa.nome ? conversa.nome.charAt(0) : <User className="h-3 w-3" />}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-xs truncate">{conversa.nome ?? conversa.telefone}</p>
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_COLORS[conversa.status])} />
            <span className="text-[9px] text-muted-foreground/40">{conversa.status}</span>
          </div>
          <div className="flex items-center gap-2">
            {conversa.nome && <p className="text-[9px] text-muted-foreground/40 font-mono">{conversa.telefone}</p>}
            {conversa.atendente && <p className="text-[9px] text-muted-foreground/40">• {conversa.atendente}</p>}
          </div>
        </div>

        {/* Actions */}
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-0.5">
            {/* AI Actions dropdown */}
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="ghost" className="h-6 gap-1 rounded-md text-[9px] text-primary/70 hover:text-primary">
                  {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  <span className="hidden lg:inline">IA</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-1" align="end">
                <button
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] hover:bg-accent/30 rounded-md transition-colors disabled:opacity-50"
                  onClick={() => handleAiAction("suggest")}
                  disabled={!!aiLoading}
                >
                  <Brain className="h-3 w-3 text-primary/70" /> Sugerir resposta
                </button>
                <button
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] hover:bg-accent/30 rounded-md transition-colors disabled:opacity-50"
                  onClick={() => handleAiAction("summarize")}
                  disabled={!!aiLoading}
                >
                  <Sparkles className="h-3 w-3 text-primary/70" /> Resumir caso
                </button>
                <button
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] hover:bg-accent/30 rounded-md transition-colors disabled:opacity-50"
                  onClick={() => handleAiAction("extract")}
                  disabled={!!aiLoading}
                >
                  <Database className="h-3 w-3 text-primary/70" /> Extrair dados
                </button>
                <button
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] hover:bg-accent/30 rounded-md transition-colors disabled:opacity-50"
                  onClick={() => handleAiAction("next_action")}
                  disabled={!!aiLoading}
                >
                  <ArrowRight className="h-3 w-3 text-primary/70" /> Próxima ação
                </button>
              </PopoverContent>
            </Popover>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md text-muted-foreground/60" onClick={onAssume}>
                  <UserCheck className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px]">Assumir</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md text-muted-foreground/60" onClick={onPendente}>
                  <Clock className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px]">Pendente</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md text-muted-foreground/60 hover:text-emerald-600 dark:hover:text-emerald-400" onClick={onFinalizar}>
                  <CheckCircle className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px]">Concluir</TooltipContent>
            </Tooltip>

            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md text-muted-foreground/60">
                  <Tag className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-36 p-1" align="end">
                {ETIQUETAS_OPTIONS.map((e) => (
                  <label key={e} className="flex items-center gap-2 py-1 px-2 hover:bg-accent/30 rounded-md cursor-pointer text-[11px]">
                    <Checkbox checked={conversa.etiquetas.includes(e)} onCheckedChange={() => onToggleEtiqueta(e)} className="h-3 w-3" />
                    {e}
                  </label>
                ))}
              </PopoverContent>
            </Popover>

            {onToggleContext && !isMobile && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md text-muted-foreground/60" onClick={onToggleContext}>
                    {showContext ? <PanelRightClose className="h-3 w-3" /> : <PanelRightOpen className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-[10px]">{showContext ? "Modo foco" : "Contexto CRM"}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* AI Result banner */}
      {(summary || aiResult) && (
        <div className="mx-3 mt-1.5 p-2 bg-primary/5 border border-primary/10 rounded-lg relative animate-in fade-in slide-in-from-top-1 duration-200">
          <button
            onClick={() => { setSummary(null); setAiResult(null); }}
            className="absolute top-1 right-1.5 text-muted-foreground/30 hover:text-foreground text-[10px]"
          >
            ✕
          </button>
          <div className="flex items-center gap-1 mb-0.5">
            <Sparkles className="h-2.5 w-2.5 text-primary" />
            <span className="text-[8px] font-semibold uppercase tracking-wider text-primary/60">
              {summary ? "Resumo IA" : aiResult?.type === "extract" ? "Dados Extraídos" : aiResult?.type === "next_action" ? "Próxima Ação" : "IA"}
            </span>
          </div>
          <p className="text-[10px] leading-relaxed text-foreground/70 whitespace-pre-line pr-4">
            {summary || aiResult?.text}
          </p>
          {aiResult?.type === "next_action" && (
            <Button size="sm" variant="outline" className="mt-1.5 h-5 text-[9px] rounded-md" onClick={() => { toast({ title: "Ação aplicada ✅" }); setAiResult(null); }}>
              Aplicar
            </Button>
          )}
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-2 space-y-0.5 max-w-2xl mx-auto">
          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center py-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-muted-foreground/50 hover:text-foreground"
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
                <div className="flex items-center justify-center my-2.5">
                  <span className="text-[8px] font-medium text-muted-foreground/35 bg-muted/15 px-2 py-0.5 rounded-full">
                    {group.label}
                  </span>
                </div>

                {group.messages.map((m, idx) => {
                  const prev = idx > 0 ? group.messages[idx - 1] : null;
                  const isGrouped = isSameAuthorGroup(m, prev);
                  const showTime = shouldShowTimestamp(m, prev);
                  const isMe = m.de === "atendente";

                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "flex animate-in fade-in duration-150",
                        isMe ? "justify-end" : "justify-start",
                        isGrouped ? "mt-0.5" : "mt-1.5"
                      )}
                    >
                      <div className={cn("max-w-[72%]", isMe ? "items-end" : "items-start")}>
                        <div
                          className={cn(
                            "px-2.5 py-1.5",
                            isMe
                              ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                              : "bg-card border border-border/20 rounded-2xl rounded-bl-sm"
                          )}
                        >
                          <p className="text-[12px] leading-relaxed whitespace-pre-wrap">{m.texto}</p>
                        </div>
                        {showTime && (
                          <p className={cn(
                            "text-[8px] mt-0.5 px-1",
                            isMe ? "text-right text-muted-foreground/30" : "text-muted-foreground/30"
                          )}>
                            {m.horario.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="relative border-t border-border/20 bg-card/20 backdrop-blur-sm">
        {/* Quick replies */}
        {showQuickReplies && (
          <div className="absolute bottom-full left-0 right-0 mx-3 mb-1 bg-popover border border-border/30 rounded-lg shadow-lg max-h-[160px] overflow-y-auto z-50">
            {filteredReplies.map((r, i) => (
              <button
                key={r.id}
                className={cn(
                  "w-full text-left px-2.5 py-1.5 text-[11px] hover:bg-accent/30 transition-colors first:rounded-t-lg last:rounded-b-lg",
                  i === quickReplyIndex && "bg-accent/30"
                )}
                onMouseDown={(e) => { e.preventDefault(); selectQuickReply(r.texto); }}
              >
                <span className="font-medium text-primary text-[9px]">/{r.atalho}</span>
                <span className="ml-1.5 text-muted-foreground/50 text-[9px]">{r.titulo}</span>
              </button>
            ))}
          </div>
        )}

        {/* Template + Action chips */}
        <div className="flex gap-1 px-3 pt-1.5 pb-0.5 overflow-x-auto scrollbar-none">
          {smartTemplates.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSmartTemplate(t)}
              className="shrink-0 flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded-full border border-border/15 text-muted-foreground/45 hover:text-foreground hover:border-primary/20 hover:bg-primary/5 transition-all"
            >
              <span>{t.emoji}</span>
              <span>{t.label}</span>
              {t.actions && <Zap className="h-1.5 w-1.5 text-primary/40" />}
            </button>
          ))}
          <div className="w-px bg-border/20 mx-0.5 shrink-0" />
          {/* Action chips */}
          <button
            onClick={() => { toast({ title: "Follow-up 24h criado 📅" }); }}
            className="shrink-0 flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded-full border border-primary/15 text-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
          >
            <CalendarPlus className="h-2 w-2" /> 24h
          </button>
          <button
            onClick={() => { toast({ title: "Follow-up 48h criado 📅" }); }}
            className="shrink-0 flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded-full border border-primary/15 text-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
          >
            <CalendarPlus className="h-2 w-2" /> 48h
          </button>
          <button
            onClick={onPendente}
            className="shrink-0 flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded-full border border-amber-500/15 text-amber-600/50 dark:text-amber-400/50 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/5 transition-all"
          >
            <Clock className="h-2 w-2" /> Pendente
          </button>
          <button
            onClick={() => onToggleEtiqueta("Urgente")}
            className="shrink-0 flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded-full border border-destructive/15 text-destructive/50 hover:text-destructive hover:bg-destructive/5 transition-all"
          >
            <AlertTriangle className="h-2 w-2" /> Urgente
          </button>
        </div>

        <div className="flex gap-1.5 items-end px-3 pb-2 pt-1">
          <div className="flex gap-0.5 shrink-0">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 rounded-md text-muted-foreground/40"
                    onClick={() => onMsgTextChange(msgText.startsWith("/") ? msgText : "/")}
                  >
                    <FileText className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-[10px]">Templates (/)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Textarea
            ref={textareaRef}
            placeholder="Mensagem..."
            value={msgText}
            onChange={(e) => {
              onMsgTextChange(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
            }}
            onKeyDown={handleKeyDown}
            className="min-h-[32px] max-h-[100px] resize-none text-[11px] flex-1 rounded-lg bg-muted/15 border-border/15 focus-visible:border-primary/25 focus-visible:bg-background transition-all"
            rows={1}
          />

          <Button
            size="icon"
            onClick={onSend}
            disabled={!msgText.trim()}
            className="shrink-0 rounded-lg h-8 w-8"
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>

        <div className="text-center pb-0.5">
          <span className="text-[7px] text-muted-foreground/25">Enter envia • Shift+Enter nova linha • / templates • ⌘K buscar</span>
        </div>
      </div>
    </div>
  );
}
