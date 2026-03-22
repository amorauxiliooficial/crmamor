import {
  ArrowLeft, User, Clock, CheckCircle,
  Sparkles, Loader2, Brain, Database, ArrowRight,
  MoreVertical, Bot,
  ArrowRightLeft, RotateCw,
  Bell, BellOff, Info,
  PanelRightOpen, PanelRightClose,
  Globe, Smartphone, UserCheck, WifiOff,
} from "lucide-react";
import { WindowBadge } from "@/components/atendimento/WindowBadge";
import { ConsumptionBadge } from "@/components/atendimento/ConsumptionBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getContactDisplay } from "@/lib/contactDisplay";
import type { Conversa } from "@/data/atendimentoMock";
import type { ConnectionStatus } from "@/hooks/useRealtimeConnection";

const QUEUE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  novo: { label: "Novo atendimento", color: "text-primary" },
  em_atendimento: { label: "Em atendimento", color: "text-emerald-600 dark:text-emerald-400" },
  aguardando_cliente: { label: "Aguardando cliente", color: "text-amber-600 dark:text-amber-400" },
  encerrado: { label: "Encerrado", color: "text-muted-foreground" },
};

const ETIQUETAS_OPTIONS = ["Suporte", "Financeiro", "Reclamação", "Venda", "Urgente"];

type AiAction = "suggest" | "summarize" | "extract" | "next_action";

export interface ChatConversationHeaderProps {
  conversa: Conversa;
  isMobile: boolean;
  onBack: () => void;
  onAssume: () => void;
  onPendente: () => void;
  onFinalizar: () => void;
  onReopen?: () => void;
  onTransfer?: () => void;
  onToggleEtiqueta: (e: string) => void;
  showContext?: boolean;
  onToggleContext?: () => void;
  currentUserId?: string | null;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  connectionStatus?: ConnectionStatus;
  connectionDot: string;
  onReconnect?: () => void;
  aiEnabled?: boolean;
  onToggleAi?: () => void;
  aiAgents?: { id: string; name: string; model: string }[];
  selectedAiAgentId?: string | null;
  onChangeAiAgent?: (agentId: string | null) => void;
  aiLoading: AiAction | null;
  onAiAction: (action: AiAction) => void;
  effectiveLastInboundAt: Date | null;
  onOpenTemplateDialog: () => void;
  channel: string;
  onChangeChannel?: (channel: string) => void;
  onTransferToWeb?: () => void;
}

export function ChatConversationHeader({
  conversa,
  isMobile,
  onBack,
  onAssume,
  onPendente,
  onFinalizar,
  onReopen,
  onTransfer,
  onToggleEtiqueta,
  showContext,
  onToggleContext,
  currentUserId,
  soundEnabled,
  onToggleSound,
  connectionStatus = "connected",
  connectionDot,
  onReconnect,
  aiEnabled,
  onToggleAi,
  aiAgents = [],
  selectedAiAgentId,
  onChangeAiAgent,
  aiLoading,
  onAiAction,
  effectiveLastInboundAt,
  onOpenTemplateDialog,
  channel,
  onChangeChannel,
  onTransferToWeb,
}: ChatConversationHeaderProps) {
  const ci = getContactDisplay(conversa.nome, conversa.waName, conversa.telefone);

  return (
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

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-[15px] truncate">{ci.displayName}</p>
          <span className={cn("h-2 w-2 rounded-full shrink-0", connectionDot)} />
          <WindowBadge lastInboundAt={effectiveLastInboundAt} onSendTemplate={onOpenTemplateDialog} />
          <ConsumptionBadge conversationId={conversa.id} lastInboundAt={effectiveLastInboundAt} />
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
        {ci.subtitle && <p className="text-[12px] text-primary/70 truncate">{ci.subtitle}</p>}
        <p className={cn("text-[11px] font-medium", QUEUE_STATUS_LABELS[conversa.queueStatus ?? ""]?.color ?? "text-muted-foreground/40")}>
          {QUEUE_STATUS_LABELS[conversa.queueStatus ?? ""]?.label ?? conversa.status}
          {conversa.atendente && <span className="text-muted-foreground/50 font-normal"> · {conversa.atendente}</span>}
        </p>
      </div>

      <div className="flex items-center gap-0.5">
        {/* IA actions */}
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 rounded-lg text-xs text-muted-foreground/60 hover:text-primary">
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span className="hidden lg:inline text-[12px]">IA</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1" align="end">
            <button className="w-full flex items-center gap-2 px-2.5 py-2 text-xs hover:bg-muted/30 rounded-lg transition-colors disabled:opacity-50" onClick={() => onAiAction("suggest")} disabled={!!aiLoading}>
              <Brain className="h-3.5 w-3.5 text-muted-foreground/50" /> Sugerir resposta
            </button>
            <button className="w-full flex items-center gap-2 px-2.5 py-2 text-xs hover:bg-muted/30 rounded-lg transition-colors disabled:opacity-50" onClick={() => onAiAction("summarize")} disabled={!!aiLoading}>
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground/50" /> Resumir caso
            </button>
            <button className="w-full flex items-center gap-2 px-2.5 py-2 text-xs hover:bg-muted/30 rounded-lg transition-colors disabled:opacity-50" onClick={() => onAiAction("extract")} disabled={!!aiLoading}>
              <Database className="h-3.5 w-3.5 text-muted-foreground/50" /> Extrair dados
            </button>
            <button className="w-full flex items-center gap-2 px-2.5 py-2 text-xs hover:bg-muted/30 rounded-lg transition-colors disabled:opacity-50" onClick={() => onAiAction("next_action")} disabled={!!aiLoading}>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" /> Próxima ação
            </button>
          </PopoverContent>
        </Popover>

        {/* ⋯ Actions menu */}
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

            {onChangeChannel && (
              channel === "official" || channel === "meta_api" || channel === "meta" ? (
                <button className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs hover:bg-muted/30 rounded-lg transition-colors text-amber-600 dark:text-amber-400" onClick={() => onTransferToWeb?.()}>
                  <Globe className="h-3.5 w-3.5" /> Transferir para WhatsApp Web
                </button>
              ) : (
                <button className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs hover:bg-muted/30 rounded-lg transition-colors text-emerald-600 dark:text-emerald-400" onClick={() => onChangeChannel("official")}>
                  <Smartphone className="h-3.5 w-3.5" /> Voltar para Oficial
                </button>
              )
            )}

            {onToggleAi && (
              <button className={cn("w-full flex items-center gap-2.5 px-2.5 py-2 text-xs hover:bg-muted/30 rounded-lg transition-colors", aiEnabled ? "text-primary" : "text-muted-foreground/70")} onClick={onToggleAi}>
                <Bot className="h-3.5 w-3.5" />
                {aiEnabled ? "Desativar IA automática" : "Ativar IA automática"}
              </button>
            )}

            {aiEnabled && onChangeAiAgent && aiAgents.length > 0 && (
              <div className="px-2.5 py-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/35 mb-1">Agente IA</p>
                <button className={cn("w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition-colors", !selectedAiAgentId ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/30 text-muted-foreground/70")} onClick={() => onChangeAiAgent(null)}>Padrão</button>
                {aiAgents.map(a => (
                  <button key={a.id} className={cn("w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition-colors", selectedAiAgentId === a.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/30 text-muted-foreground/70")} onClick={() => onChangeAiAgent(a.id)}>
                    {a.name} <span className="text-[9px] text-muted-foreground/40">{a.model}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="h-px bg-border/10 my-1" />

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

            {onToggleSound && (
              <button className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs hover:bg-muted/30 rounded-lg transition-colors" onClick={onToggleSound}>
                {soundEnabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                {soundEnabled ? "Desativar som" : "Ativar som"}
              </button>
            )}

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
                  {isMobile ? <Info className="h-4 w-4" /> : showContext ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
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
  );
}
