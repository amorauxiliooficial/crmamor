import { useState, useMemo, useCallback } from "react";
import { Sparkles, MessageSquare } from "lucide-react";
import { useWindowStatus } from "@/components/atendimento/WindowBadge";
import { SendTemplateDialog } from "@/components/atendimento/SendTemplateDialog";
import { ChatConversationHeader } from "@/components/atendimento/ChatConversationHeader";
import { ChatMessageList } from "@/components/atendimento/ChatMessageList";
import { ChatInputBar } from "@/components/atendimento/ChatInputBar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Conversa, Mensagem } from "@/data/atendimentoMock";
import type { RespostaRapida } from "@/data/respostasRapidas";
import type { ConversationEvent } from "@/hooks/useConversationEvents";
import type { ConnectionStatus } from "@/hooks/useRealtimeConnection";

type AiAction = "suggest" | "summarize" | "extract" | "next_action";

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
  isSending?: boolean;
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
  isSending = false,
}: ChatPanelProps) {
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState<AiAction | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{ type: AiAction; text: string } | null>(null);
  const [replyTo, setReplyTo] = useState<Mensagem | null>(null);
  const { toast } = useToast();

  // Window status
  const effectiveLastInboundAt = useMemo(() => {
    const dbLastInbound = lastInboundAt ?? null;
    const inboundFromMessages = mensagens
      .filter((m) => m.de !== "atendente")
      .reduce<Date | null>((latest, m) => (!latest ? m.horario : m.horario > latest ? m.horario : latest), null);
    if (!dbLastInbound) return inboundFromMessages;
    if (!inboundFromMessages) return dbLastInbound;
    return inboundFromMessages > dbLastInbound ? inboundFromMessages : dbLastInbound;
  }, [lastInboundAt, mensagens]);

  const rawWindowStatus = useWindowStatus(effectiveLastInboundAt);
  const isEvolutionChannel = channel === "evolution";
  const windowStatus = isEvolutionChannel
    ? { isOpen: true, expiresAt: rawWindowStatus.expiresAt, remainingMs: rawWindowStatus.remainingMs }
    : rawWindowStatus;

  // Connection dot
  const connectionDot = connectionStatus === "connected"
    ? "bg-emerald-500"
    : connectionStatus === "connecting" ? "bg-amber-500 animate-pulse" : "bg-destructive";

  // AI actions
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
      if (action === "summarize") setSummary(data.summary);
      else if (action === "suggest") { onMsgTextChange(data.summary || data.suggestion || ""); }
      else setAiResult({ type: action, text: data.summary || data.result || "" });
      toast({ title: action === "summarize" ? "Resumo gerado ✨" : action === "suggest" ? "Sugestão inserida ✨" : "Análise IA concluída ✨" });
    } catch {
      toast({ title: "Erro na IA", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setAiLoading(null);
    }
  }, [conversa, mensagens, toast, onMsgTextChange]);

  // Empty state
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

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 w-full overflow-x-hidden bg-background">
      <ChatConversationHeader
        conversa={conversa}
        isMobile={isMobile}
        onBack={onBack}
        onAssume={onAssume}
        onPendente={onPendente}
        onFinalizar={onFinalizar}
        onReopen={onReopen}
        onTransfer={onTransfer}
        onToggleEtiqueta={onToggleEtiqueta}
        showContext={showContext}
        onToggleContext={onToggleContext}
        currentUserId={currentUserId}
        soundEnabled={soundEnabled}
        onToggleSound={onToggleSound}
        connectionStatus={connectionStatus}
        connectionDot={connectionDot}
        onReconnect={onReconnect}
        aiEnabled={aiEnabled}
        onToggleAi={onToggleAi}
        aiAgents={aiAgents}
        selectedAiAgentId={selectedAiAgentId}
        onChangeAiAgent={onChangeAiAgent}
        aiLoading={aiLoading}
        onAiAction={handleAiAction}
        effectiveLastInboundAt={effectiveLastInboundAt}
        onOpenTemplateDialog={() => setTemplateDialogOpen(true)}
        channel={channel}
        onChangeChannel={onChangeChannel}
        onTransferToWeb={onTransferToWeb}
      />

      {/* AI Result banner */}
      {(summary || aiResult) && (
        <div className="mx-4 mt-2 p-3 bg-primary/5 border border-primary/10 rounded-xl relative animate-in fade-in slide-in-from-top-1 duration-200">
          <button onClick={() => { setSummary(null); setAiResult(null); }} className="absolute top-2 right-2 text-muted-foreground/30 hover:text-foreground text-xs">✕</button>
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/60">
              {summary ? "Resumo IA" : aiResult?.type === "extract" ? "Dados Extraídos" : aiResult?.type === "next_action" ? "Próxima Ação" : "IA"}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-foreground/70 whitespace-pre-line pr-6">{summary || aiResult?.text}</p>
          {aiResult?.type === "next_action" && (
            <Button size="sm" variant="outline" className="mt-2 h-7 text-xs rounded-lg" onClick={() => { toast({ title: "Ação aplicada ✅" }); setAiResult(null); }}>Aplicar</Button>
          )}
        </div>
      )}

      <ChatMessageList
        conversationId={conversa.id}
        mensagens={mensagens}
        isMobile={isMobile}
        isLoadingMessages={isLoadingMessages}
        currentUserId={currentUserId}
        onEditMessage={onEditMessage}
        onRetry={onRetry}
        conversationEvents={conversationEvents}
        profileMap={profileMap}
        onReply={setReplyTo}
      />

      <ChatInputBar
        conversationId={conversa.id}
        msgText={msgText}
        onMsgTextChange={onMsgTextChange}
        onSend={onSend}
        onSendMedia={onSendMedia}
        respostas={respostas}
        isMobile={isMobile}
        windowIsOpen={windowStatus.isOpen}
        onOpenTemplateDialog={() => setTemplateDialogOpen(true)}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        channel={channel}
      />

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
