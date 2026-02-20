import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import {
  Send, ArrowLeft, User, UserCheck, Clock, CheckCircle, Tag,
  FileText, Sparkles, Mic, PanelRightOpen, PanelRightClose,
  Loader2, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplyIndex, setQuickReplyIndex] = useState(0);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
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
  }, [conversa?.id, mensagens]);

  useEffect(() => {
    setSummary(null);
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

  const handleSummarize = useCallback(async () => {
    if (!conversa || mensagens.length === 0) return;
    setSummarizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-conversation", {
        body: {
          messages: mensagens.map((m) => ({ de: m.de, texto: m.texto })),
          contactName: conversa.nome ?? conversa.telefone,
        },
      });
      if (error) throw error;
      setSummary(data.summary);
      toast({ title: "Resumo gerado ✨" });
    } catch (err) {
      console.error("Summary error:", err);
      toast({ title: "Erro ao resumir", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setSummarizing(false);
    }
  }, [conversa, mensagens, toast]);

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

  const messageGroups = useMemo(() => {
    const groups: { label: string; messages: Mensagem[] }[] = [];
    let currentLabel = "";
    mensagens.forEach((m) => {
      const label = formatDayLabel(m.horario);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, messages: [m] });
      } else {
        groups[groups.length - 1].messages.push(m);
      }
    });
    return groups;
  }, [mensagens]);

  if (!conversa) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 h-full bg-background">
        <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center">
          <MessageSquare className="h-6 w-6 text-muted-foreground/30" />
        </div>
        <div className="text-center space-y-0.5">
          <p className="text-sm font-medium text-muted-foreground/70">Selecione uma conversa</p>
          <p className="text-xs text-muted-foreground/40">Escolha um contato na lista</p>
        </div>
        <kbd className="hidden md:inline-flex items-center gap-1 rounded-lg border border-border/30 bg-muted/20 px-2 py-0.5 text-[10px] text-muted-foreground/40 font-mono">
          ⌘K buscar
        </kbd>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-background">
      {/* Header */}
      <div className="border-b border-border/30 px-4 py-2.5 flex items-center gap-3 shrink-0 bg-card/50 backdrop-blur-sm">
        {isMobile && (
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
            {conversa.nome ? conversa.nome.charAt(0) : <User className="h-3.5 w-3.5" />}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm truncate">{conversa.nome ?? conversa.telefone}</p>
            <Badge variant="outline" className="h-4 text-[8px] px-1.5 gap-1 border-border/30 rounded-full shrink-0">
              <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_COLORS[conversa.status])} />
              {conversa.status}
            </Badge>
          </div>
          {conversa.nome && (
            <p className="text-[10px] text-muted-foreground/50 font-mono">{conversa.telefone}</p>
          )}
        </div>

        {/* Actions */}
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 rounded-lg text-[10px] text-muted-foreground hover:text-primary"
                  onClick={handleSummarize}
                  disabled={summarizing || mensagens.length === 0}
                >
                  {summarizing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  <span className="hidden lg:inline">Resumir</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px]">Resumir caso com IA</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 gap-1 rounded-lg text-[10px] text-muted-foreground hover:text-foreground" onClick={onAssume}>
                  <UserCheck className="h-3 w-3" />
                  <span className="hidden lg:inline">Assumir</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px]">Assumir conversa</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 gap-1 rounded-lg text-[10px] text-muted-foreground hover:text-foreground" onClick={onPendente}>
                  <Clock className="h-3 w-3" />
                  <span className="hidden lg:inline">Pendente</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px]">Marcar pendente</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 gap-1 rounded-lg text-[10px] text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400" onClick={onFinalizar}>
                  <CheckCircle className="h-3 w-3" />
                  <span className="hidden lg:inline">Concluir</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px]">Finalizar</TooltipContent>
            </Tooltip>

            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-muted-foreground">
                  <Tag className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1" align="end">
                {ETIQUETAS_OPTIONS.map((e) => (
                  <label key={e} className="flex items-center gap-2 py-1.5 px-2 hover:bg-accent/30 rounded-md cursor-pointer text-xs">
                    <Checkbox checked={conversa.etiquetas.includes(e)} onCheckedChange={() => onToggleEtiqueta(e)} className="h-3.5 w-3.5" />
                    {e}
                  </label>
                ))}
              </PopoverContent>
            </Popover>

            {onToggleContext && !isMobile && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-muted-foreground" onClick={onToggleContext}>
                    {showContext ? <PanelRightClose className="h-3 w-3" /> : <PanelRightOpen className="h-3 w-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-[10px]">{showContext ? "Modo foco" : "Contexto CRM"}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* AI Summary banner */}
      {summary && (
        <div className="mx-3 mt-2 p-2.5 bg-primary/5 border border-primary/10 rounded-xl relative">
          <button
            onClick={() => setSummary(null)}
            className="absolute top-1.5 right-2 text-muted-foreground/30 hover:text-foreground text-[10px]"
          >
            ✕
          </button>
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="h-2.5 w-2.5 text-primary" />
            <span className="text-[9px] font-semibold uppercase tracking-wider text-primary/70">Resumo IA</span>
          </div>
          <p className="text-[11px] leading-relaxed text-foreground/70 whitespace-pre-line">{summary}</p>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-3 space-y-0.5 max-w-2xl mx-auto">
          {messageGroups.map((group) => (
            <div key={group.label}>
              <div className="flex items-center justify-center my-3">
                <span className="text-[9px] font-medium text-muted-foreground/40 bg-muted/20 px-2.5 py-0.5 rounded-full">
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
                      "flex",
                      isMe ? "justify-end" : "justify-start",
                      isGrouped ? "mt-0.5" : "mt-2"
                    )}
                  >
                    <div className={cn("max-w-[72%] group", isMe ? "items-end" : "items-start")}>
                      <div
                        className={cn(
                          "px-3 py-1.5",
                          isMe
                            ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
                            : "bg-card border border-border/30 rounded-2xl rounded-bl-sm"
                        )}
                      >
                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{m.texto}</p>
                      </div>
                      {showTime && (
                        <p className={cn(
                          "text-[9px] mt-0.5 px-1",
                          isMe ? "text-right text-muted-foreground/35" : "text-muted-foreground/35"
                        )}>
                          {m.horario.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="relative border-t border-border/30 bg-card/30 backdrop-blur-sm">
        {/* Quick replies */}
        {showQuickReplies && (
          <div className="absolute bottom-full left-0 right-0 mx-3 mb-1 bg-popover border border-border/40 rounded-xl shadow-lg max-h-[180px] overflow-y-auto z-50">
            {filteredReplies.map((r, i) => (
              <button
                key={r.id}
                className={cn(
                  "w-full text-left px-3 py-1.5 text-xs hover:bg-accent/30 transition-colors first:rounded-t-xl last:rounded-b-xl",
                  i === quickReplyIndex && "bg-accent/30"
                )}
                onMouseDown={(e) => { e.preventDefault(); selectQuickReply(r.texto); }}
              >
                <span className="font-medium text-primary text-[10px]">/{r.atalho}</span>
                <span className="ml-2 text-muted-foreground/60 text-[10px]">{r.titulo}</span>
              </button>
            ))}
          </div>
        )}

        {/* Smart template chips */}
        <div className="flex gap-1 px-3 pt-2 pb-0.5 overflow-x-auto scrollbar-none">
          {smartTemplates.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSmartTemplate(t)}
              className={cn(
                "shrink-0 flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border transition-all",
                "border-border/20 text-muted-foreground/50 hover:text-foreground hover:border-primary/20 hover:bg-primary/5"
              )}
            >
              <span>{t.emoji}</span>
              <span>{t.label}</span>
              {t.actions && <Zap className="h-2 w-2 text-primary/50" />}
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-end px-3 pb-2.5 pt-1">
          <div className="flex gap-0.5 shrink-0">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-lg text-muted-foreground/50"
                    onClick={() => onMsgTextChange(msgText.startsWith("/") ? msgText : "/")}
                  >
                    <FileText className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-[10px]">Templates (/)</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-muted-foreground/50" disabled>
                    <Mic className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="text-[10px]">Em breve</TooltipContent>
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
            className="min-h-[36px] max-h-[100px] resize-none text-xs flex-1 rounded-xl bg-muted/20 border-border/20 focus-visible:border-primary/30 focus-visible:bg-background transition-all"
            rows={1}
          />

          <Button
            size="icon"
            onClick={onSend}
            disabled={!msgText.trim()}
            className="shrink-0 rounded-xl h-9 w-9"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="text-center pb-1">
          <span className="text-[8px] text-muted-foreground/30">Enter envia • Shift+Enter nova linha • / templates</span>
        </div>
      </div>
    </div>
  );
}
