import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import {
  Send, ArrowLeft, User, UserCheck, Clock, CheckCircle, Tag,
  FileText, Sparkles, Mic,
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
import type { Conversa, Mensagem } from "@/data/atendimentoMock";
import type { RespostaRapida } from "@/data/respostasRapidas";

const STATUS_COLORS: Record<string, string> = {
  Aberto: "bg-green-500",
  Pendente: "bg-yellow-500",
  Fechado: "bg-muted-foreground",
};

const ETIQUETAS_OPTIONS = ["Suporte", "Financeiro", "Reclamação", "Venda", "Urgente"];

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
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplyIndex, setQuickReplyIndex] = useState(0);

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

  function handleKeyDown(e: React.KeyboardEvent) {
    if (showQuickReplies) {
      if (e.key === "ArrowDown") { e.preventDefault(); setQuickReplyIndex((i) => Math.min(i + 1, filteredReplies.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setQuickReplyIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter") { e.preventDefault(); selectQuickReply(filteredReplies[quickReplyIndex].texto); return; }
      if (e.key === "Escape") { e.preventDefault(); setShowQuickReplies(false); return; }
    }
    // Ctrl+Enter or Enter (without shift) sends
    if ((e.key === "Enter" && (e.ctrlKey || e.metaKey)) || (e.key === "Enter" && !e.shiftKey)) {
      e.preventDefault();
      onSend();
    }
  }

  if (!conversa) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 h-full">
        <MessageSquare className="h-16 w-16 opacity-20" />
        <p className="text-lg font-medium">Selecione uma conversa</p>
        <p className="text-sm">Escolha uma conversa à esquerda para começar</p>
        <kbd className="hidden md:inline-flex items-center gap-1 rounded border border-border bg-muted px-2 py-1 text-xs text-muted-foreground font-mono mt-2">
          ⌘K para buscar
        </kbd>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-w-0">
      {/* Header */}
      <div className="border-b border-border px-3 py-2.5 flex items-center gap-3 shrink-0">
        {isMobile && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="text-sm bg-primary/10 text-primary">
            {conversa.nome ? conversa.nome.charAt(0) : <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{conversa.nome ?? conversa.telefone}</p>
          {conversa.nome && <p className="text-xs text-muted-foreground">{conversa.telefone}</p>}
        </div>
        <Badge variant="outline" className="text-[11px] shrink-0 gap-1">
          <span className={cn("h-2 w-2 rounded-full", STATUS_COLORS[conversa.status])} />
          {conversa.status}
        </Badge>

        <TooltipProvider delayDuration={200}>
          <div className="ml-auto flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onAssume}>
                  <UserCheck className="h-4 w-4 text-blue-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Assumir</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onPendente}>
                  <Clock className="h-4 w-4 text-yellow-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Pendente</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onFinalizar}>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Finalizar</TooltipContent>
            </Tooltip>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <Tag className="h-4 w-4 text-purple-500" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                {ETIQUETAS_OPTIONS.map((e) => (
                  <label key={e} className="flex items-center gap-2 py-1.5 px-2 hover:bg-accent rounded cursor-pointer text-sm">
                    <Checkbox checked={conversa.etiquetas.includes(e)} onCheckedChange={() => onToggleEtiqueta(e)} />
                    {e}
                  </label>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </TooltipProvider>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3 max-w-3xl mx-auto">
          {mensagens.map((m) => (
            <div key={m.id} className={cn("flex", m.de === "atendente" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "rounded-2xl px-3.5 py-2 max-w-[75%] shadow-sm",
                  m.de === "atendente"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md"
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{m.texto}</p>
                <p className={cn("text-[10px] mt-1", m.de === "atendente" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {m.horario.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Composer */}
      <div className="relative border-t border-border p-3 shrink-0">
        {showQuickReplies && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-popover border border-border rounded-lg shadow-lg max-h-[220px] overflow-y-auto z-50">
            {filteredReplies.map((r, i) => (
              <button
                key={r.id}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors",
                  i === quickReplyIndex && "bg-accent"
                )}
                onMouseDown={(e) => { e.preventDefault(); selectQuickReply(r.texto); }}
              >
                <span className="font-medium text-foreground">/{r.atalho}</span>
                <span className="ml-2 text-muted-foreground">{r.titulo}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end">
          {/* Compact buttons */}
          <div className="flex gap-0.5 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => onMsgTextChange(msgText.startsWith("/") ? msgText : "/")}
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Templates (/)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8" disabled>
                  <Sparkles className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>IA (em breve)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8" disabled>
                  <Mic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Áudio (em breve)</TooltipContent>
            </Tooltip>
          </div>

          <Textarea
            ref={textareaRef}
            placeholder='Mensagem... (/ para templates, Ctrl+Enter envia)'
            value={msgText}
            onChange={(e) => {
              onMsgTextChange(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px";
            }}
            onKeyDown={handleKeyDown}
            className="min-h-[40px] max-h-[80px] resize-none text-sm flex-1"
            rows={1}
          />
          <Button size="icon" onClick={onSend} disabled={!msgText.trim()} className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
