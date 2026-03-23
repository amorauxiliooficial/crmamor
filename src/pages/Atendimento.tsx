import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useDebouncedCallback } from "use-debounce";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useInboundNotification } from "@/hooks/useInboundNotification";
import { useWaConversations, useWaMessages, useSendWhatsApp, useRetryWhatsApp, useMarkConversationRead, useUpdateConversationStatus, useEditMessage, useAssumeConversation, useTransferConversation, useCloseConversation, useReopenConversation, type WaConversation } from "@/hooks/useWhatsApp";
import { useConversationEvents, useCreateConversationEvent } from "@/hooks/useConversationEvents";
import { useRealtimeConnection } from "@/hooks/useRealtimeConnection";
import { respostasRapidas } from "@/data/respostasRapidas";
import { InboxSidebar } from "@/components/atendimento/InboxSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ChatPanel } from "@/components/atendimento/ChatPanel";
import { CrmContextPanel } from "@/components/atendimento/CrmContextPanel";
import { MobileBottomNav, type MobileTab } from "@/components/atendimento/MobileBottomNav";
import { useAssignmentActions } from "@/hooks/useAssignmentEvents";
import { useTimelineActions } from "@/hooks/useTimelineEvents";
import { CommandPalette } from "@/components/atendimento/CommandPalette";
import { TransferDialog } from "@/components/atendimento/TransferDialog";
import { TransferToWebDialog } from "@/components/atendimento/TransferToWebDialog";
import { SettingsDrawer } from "@/components/atendimento/SettingsDrawer";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import type { Conversa, Mensagem } from "@/data/atendimentoMock";

import { useAtendimentoMessages } from "@/hooks/useAtendimentoMessages";
import { useAtendimentoConversation } from "@/hooks/useAtendimentoConversation";
import { useAtendimentoAI } from "@/hooks/useAtendimentoAI";
import { useAtendimentoChannel } from "@/hooks/useAtendimentoChannel";

// Convert WA data to existing UI types
function waToConversa(wa: WaConversation, profileMap: Map<string, string>): Conversa {
  const statusMap: Record<string, "Aberto" | "Pendente" | "Fechado"> = {
    open: "Aberto",
    pending: "Pendente",
    closed: "Fechado",
  };
  const assignedName = wa.assigned_to ? profileMap.get(wa.assigned_to) ?? null : null;

  let queueStatus: Conversa["queueStatus"] = "novo";
  if (wa.status === "closed") queueStatus = "encerrado";
  else if (!wa.assigned_to) queueStatus = "novo";
  else if (wa.unread_count === 0) queueStatus = "aguardando_cliente";
  else queueStatus = "em_atendimento";

  const lastInbound = wa.last_inbound_at ? new Date(wa.last_inbound_at) : null;
  const slaMin = lastInbound ? Math.floor((Date.now() - lastInbound.getTime()) / 60000) : Math.floor((Date.now() - new Date(wa.last_message_at).getTime()) / 60000);

  return {
    id: wa.id,
    nome: wa.wa_name,
    waName: wa.wa_name,
    telefone: wa.wa_phone.includes("@lid") ? wa.wa_phone : (wa.wa_phone.startsWith("+") ? wa.wa_phone : `+${wa.wa_phone}`),
    ultimaMensagem: wa.last_message_preview ?? "",
    horario: new Date(wa.last_message_at),
    status: statusMap[wa.status] ?? "Aberto",
    atendente: assignedName ?? (wa.assigned_to ? "Atendente" : null),
    assignedAgentId: wa.assigned_to,
    naoLidas: wa.unread_count,
    etiquetas: wa.labels ?? [],
    prioridade: "normal" as const,
    slaMinutos: slaMin,
    maeId: wa.mae_id,
    lastInboundAt: lastInbound,
    queueStatus,
  };
}

type TabFilter = "nao_lidas" | "Aberto" | "Pendente" | "Fechado" | "finalizadas";

export default function Atendimento() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { recordAssignment } = useAssignmentActions();
  const { addEvent } = useTimelineActions();

  const queryClient = useQueryClient();
  const { data: waConversations, isLoading: loadingConvos } = useWaConversations();
  const sendWhatsApp = useSendWhatsApp();
  const retryWhatsApp = useRetryWhatsApp();
  const markRead = useMarkConversationRead();
  const updateStatus = useUpdateConversationStatus();
  const editMessage = useEditMessage();
  const assumeConversation = useAssumeConversation();
  const transferConversation = useTransferConversation();
  const closeConversation = useCloseConversation();
  const reopenConversation = useReopenConversation();
  const createEvent = useCreateConversationEvent();
  const { status: connectionStatus, reconnect: onReconnect } = useRealtimeConnection();
  const { soundEnabled, autoplayBlocked, intensity, toggleSound, changeIntensity, playNotification, requestPermission, setActiveConversation } = useInboundNotification();

  useEffect(() => { requestPermission(); }, [requestPermission]);

  // Fetch all profiles for agent name mapping
  const { data: profiles } = useQuery({
    queryKey: ["profiles_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name");
      if (error) throw error;
      return data as { id: string; full_name: string | null }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const profileMap = useMemo(() => {
    const map = new Map<string, string>();
    (profiles ?? []).forEach((p) => {
      if (p.full_name) map.set(p.id, p.full_name);
    });
    return map;
  }, [profiles]);

  // Convert WA conversations to UI format
  const conversas: Conversa[] = useMemo(() => {
    return (waConversations ?? []).map((wa) => waToConversa(wa, profileMap));
  }, [waConversations, profileMap]);

  // --- Extracted hooks ---
  const {
    selectedId, setSelectedId, conversa, selectedWa, selectConversa,
    handleAssume, handleStartAtendimento, handleTransfer,
    handlePendente, handleFinalizar, handleReopen, toggleEtiqueta,
  } = useAtendimentoConversation({
    waConversations,
    conversas,
    user,
    toast,
    assumeConversation,
    transferConversation,
    closeConversation,
    reopenConversation,
    updateStatus,
    createEvent,
    recordAssignment,
    setMsgText: (t: string) => setMsgText(t),
  });

  const { data: waMessages, isLoading: loadingMsgs } = useWaMessages(selectedId);
  const { data: conversationEvents } = useConversationEvents(selectedId);

  const {
    msgText, setMsgText, handleSend, handleSendMedia, handleRetry,
  } = useAtendimentoMessages({
    conversationId: selectedId,
    selectedWa,
    sendWhatsApp,
    retryWhatsApp,
    toast,
    queryClient,
    userId: user?.id ?? null,
  });

  const {
    aiEnabled, aiAgents, selectedAiAgentId, handleToggleAi, handleChangeAiAgent,
  } = useAtendimentoAI({
    selectedId,
    selectedWa,
    toast,
    createEvent,
  });

  const { currentChannel, handleChangeChannel } = useAtendimentoChannel({
    selectedId,
    selectedWa,
    aiEnabled,
    toast,
    createEvent,
  });

  // Track active conversation for focus-aware notifications
  useEffect(() => {
    setActiveConversation(selectedId);
  }, [selectedId, setActiveConversation]);

  // Realtime listener for inbound messages
  useEffect(() => {
    const channel = supabase
      .channel("inbound_notification")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wa_messages", filter: "direction=eq.in" },
        (payload: any) => {
          const convId = payload.new?.conversation_id;
          const body = payload.new?.body;
          const conv = (waConversations ?? []).find((c) => c.id === convId);
          const contactName = conv?.wa_name || undefined;
          const preview = body?.slice(0, 80) || undefined;
          playNotification(contactName, preview, convId);
          toast({
            title: `💬 ${contactName || "Nova mensagem"}`,
            description: preview || "Você recebeu uma nova mensagem",
            duration: 6000,
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [playNotification, waConversations, toast]);

  // Convert WA messages to UI format
  const msgs: Mensagem[] = useMemo(() => {
    return (waMessages ?? []).map((m) => ({
      id: m.id,
      texto: m.body ?? "",
      de: m.direction === "in" ? ("contato" as const) : ("atendente" as const),
      horario: new Date(m.created_at),
      msgType: m.msg_type,
      mediaUrl: m.media_url,
      mediaMime: m.media_mime,
      mediaFilename: m.media_filename,
      mediaSize: m.media_size,
      mediaDuration: m.media_duration,
      status: m.status,
      errorCode: (m as any).error_code ?? null,
      errorMessage: (m as any).error_message ?? null,
      metaMessageId: m.meta_message_id,
      sentByAgentId: m.sent_by ?? null,
      sentByAgentName: m.sent_by ? profileMap.get(m.sent_by) ?? null : null,
      editedAt: (m as any).edited_at ?? null,
      editedByAgentId: (m as any).edited_by_agent_id ?? null,
    }));
  }, [waMessages, profileMap]);

  // Mark as read when selecting conversation
  useEffect(() => {
    if (selectedId && conversa && conversa.naoLidas > 0) {
      markRead.mutate(selectedId);
    }
  }, [selectedId]);

  // UI state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TabFilter | null>(null);
  const [atendenteFilter, setAtendenteFilter] = useState<"todos" | "meus">("todos");
  const [showContext, setShowContext] = useState(false);
  const [showContextDrawer, setShowContextDrawer] = useState(false);
  const [mobileCrmDrawerOpen, setMobileCrmDrawerOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("conversas");
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferToWebOpen, setTransferToWebOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    setDebouncedSearch(value);
  }, 300);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    debouncedSetSearch(value);
  }, [debouncedSetSearch]);

  const [isTablet, setIsTablet] = useState(false);
  useEffect(() => {
    const check = () => setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1280);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Sort conversations
  const sortedConversas = useMemo(() => {
    return [...conversas].sort((a, b) => {
      if (a.prioridade === "alta" && b.prioridade !== "alta") return -1;
      if (b.prioridade === "alta" && a.prioridade !== "alta") return 1;
      return b.horario.getTime() - a.horario.getTime();
    });
  }, [conversas]);

  const unreadCount = useMemo(() => conversas.filter((c) => c.naoLidas > 0).length, [conversas]);

  // Transfer dialog callback (needs access to setTransferDialogOpen)
  const onTransferSuccess = useCallback((toAgentId: string, reason?: string) => {
    handleTransfer(toAgentId, reason);
    setTransferDialogOpen(false);
  }, [handleTransfer]);

  const onEditMessage = useCallback((messageId: string, newBody: string) => {
    if (!selectedId) return;
    editMessage.mutate({ messageId, newBody, conversationId: selectedId }, {
      onSuccess: () => toast({ title: "Mensagem editada ✅" }),
      onError: (err: any) => toast({ title: "Erro ao editar", description: err?.message?.includes("row-level") ? "Permissão negada ou tempo expirado" : "Tente novamente.", variant: "destructive" }),
    });
  }, [selectedId, editMessage, toast]);

  if (loading || !user) return null;

  // Shared ChatPanel props
  const chatPanelProps = {
    conversa,
    mensagens: msgs,
    msgText,
    onMsgTextChange: setMsgText,
    onSend: handleSend,
    onSendMedia: handleSendMedia,
    onRetry: handleRetry,
    onAssume: () => handleAssume(),
    onPendente: () => handlePendente(),
    onFinalizar: () => handleFinalizar(),
    onTransfer: () => setTransferDialogOpen(true),
    onToggleEtiqueta: toggleEtiqueta,
    respostas: respostasRapidas,
    isLoadingMessages: loadingMsgs,
    currentUserId: user?.id ?? null,
    onEditMessage,
    soundEnabled,
    autoplayBlocked,
    onToggleSound: toggleSound,
    onReopen: handleReopen,
    connectionStatus,
    onReconnect,
    conversationEvents: conversationEvents ?? [],
    profileMap,
    aiEnabled,
    onToggleAi: handleToggleAi,
    aiAgents,
    selectedAiAgentId,
    onChangeAiAgent: handleChangeAiAgent,
    lastInboundAt: conversa?.lastInboundAt,
    conversationPhone: selectedWa?.wa_phone,
    channel: currentChannel,
    onChangeChannel: handleChangeChannel,
    onTransferToWeb: () => setTransferToWebOpen(true),
    isSending: sendWhatsApp.isPending,
  };

  // Mobile
  if (isMobile) {
    return (
      <div className="h-[100dvh] flex flex-col bg-background w-full overflow-x-hidden">
        <CommandPalette
          conversas={conversas}
          respostas={respostasRapidas}
          onSelectConversa={selectConversa}
          onAssumir={() => handleAssume()}
          onPendente={() => handlePendente()}
          onFinalizar={() => handleFinalizar()}
          onFilterPendentes={() => setStatusFilter("Pendente")}
          onFilterSemAtendente={() => setAtendenteFilter("todos")}
          onInsertTemplate={(t) => setMsgText(t)}
        />

        <div className="flex-1 flex flex-col min-h-0 min-w-0 w-full overflow-x-hidden">
          {selectedId && mobileTab === "conversas" ? (
            <>
              <ErrorBoundary key={selectedId} fallbackMessage="Erro no chat — selecione outra conversa">
                <ChatPanel
                  {...chatPanelProps}
                  isMobile
                  onBack={() => { setSelectedId(null); navigate("/atendimento"); }}
                  onToggleContext={() => setMobileCrmDrawerOpen(true)}
                />
              </ErrorBoundary>
              <Drawer open={mobileCrmDrawerOpen} onOpenChange={setMobileCrmDrawerOpen}>
                <DrawerContent className="max-h-[85dvh]">
                  <CrmContextPanel conversa={conversa} maeId={conversa?.maeId ?? null} className="w-full border-l-0 h-auto max-h-[80dvh]" />
                </DrawerContent>
              </Drawer>
              <TransferDialog
                open={transferDialogOpen}
                onOpenChange={setTransferDialogOpen}
                onTransfer={onTransferSuccess}
                currentAgentId={conversa?.assignedAgentId}
                isLoading={transferConversation.isPending}
              />
              {selectedWa && (
                <TransferToWebDialog
                  open={transferToWebOpen}
                  onOpenChange={setTransferToWebOpen}
                  conversationId={selectedId!}
                  contactPhone={selectedWa.wa_phone}
                  contactName={selectedWa.wa_name}
                  onTransferred={() => queryClient.invalidateQueries({ queryKey: ["wa-conversations"] })}
                />
              )}
            </>
          ) : mobileTab === "conversas" ? (
            <ErrorBoundary fallbackMessage="Erro na lista de conversas">
              <InboxSidebar
                conversas={sortedConversas}
                selectedId={selectedId}
                search={search}
                onSearchChange={handleSearchChange}
                debouncedSearch={debouncedSearch}
                onSelect={selectConversa}
                onOpenConfig={() => setSettingsOpen(true)}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                atendenteFilter={atendenteFilter}
                onAtendenteFilterChange={setAtendenteFilter}
                onAssume={handleAssume}
                onPendente={handlePendente}
                onStartAtendimento={handleStartAtendimento}
                isLoading={loadingConvos}
              />
            </ErrorBoundary>
          ) : mobileTab === "kanban" ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Kanban</p>
                <p className="text-xs text-muted-foreground/60">Acesse o painel principal para a visão completa</p>
                <button onClick={() => navigate("/")} className="text-xs text-primary font-medium">Ir para o Painel →</button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Atividades</p>
                <p className="text-xs text-muted-foreground/60">Em breve nesta aba</p>
              </div>
            </div>
          )}
        </div>

        {!(selectedId && mobileTab === "conversas") && (
          <MobileBottomNav activeTab={mobileTab} onTabChange={setMobileTab} onOpenCrmDrawer={() => setMobileCrmDrawerOpen(true)} showCrmButton={!!selectedId} unreadCount={unreadCount} />
        )}
        {!(selectedId && mobileTab === "conversas") && <div className="h-[56px] shrink-0" />}
        <SettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>
    );
  }

  // Desktop / Tablet
  return (
    <div className="flex h-screen bg-background max-w-[1600px] mx-auto">
      <CommandPalette
        conversas={conversas}
        respostas={respostasRapidas}
        onSelectConversa={selectConversa}
        onAssumir={() => handleAssume()}
        onPendente={() => handlePendente()}
        onFinalizar={() => handleFinalizar()}
        onFilterPendentes={() => setStatusFilter("Pendente")}
        onFilterSemAtendente={() => setAtendenteFilter("todos")}
        onInsertTemplate={(t) => setMsgText(t)}
      />

      <ErrorBoundary fallbackMessage="Erro na lista de conversas">
        <InboxSidebar
          conversas={sortedConversas}
          selectedId={selectedId}
          search={search}
          onSearchChange={handleSearchChange}
          debouncedSearch={debouncedSearch}
          onSelect={selectConversa}
          onOpenConfig={() => setSettingsOpen(true)}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          atendenteFilter={atendenteFilter}
          onAtendenteFilterChange={setAtendenteFilter}
          onAssume={handleAssume}
          onPendente={handlePendente}
          onStartAtendimento={handleStartAtendimento}
          isLoading={loadingConvos}
        />
      </ErrorBoundary>

      <ErrorBoundary key={selectedId} fallbackMessage="Erro no chat — selecione outra conversa">
        <ChatPanel
          {...chatPanelProps}
          isMobile={false}
          onBack={() => {}}
          showContext={showContext}
          onToggleContext={() => {
            if (isTablet) {
              setShowContextDrawer(!showContextDrawer);
            } else {
              setShowContext(!showContext);
            }
          }}
        />
      </ErrorBoundary>

      <TransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        onTransfer={onTransferSuccess}
        currentAgentId={conversa?.assignedAgentId}
        isLoading={transferConversation.isPending}
      />

      {selectedWa && (
        <TransferToWebDialog
          open={transferToWebOpen}
          onOpenChange={setTransferToWebOpen}
          conversationId={selectedId!}
          contactPhone={selectedWa.wa_phone}
          contactName={selectedWa.wa_name}
          onTransferred={() => queryClient.invalidateQueries({ queryKey: ["wa-conversations"] })}
        />
      )}

      {!isTablet && showContext && (
        <CrmContextPanel conversa={conversa} maeId={conversa?.maeId ?? null} />
      )}

      {isTablet && (
        <Sheet open={showContextDrawer} onOpenChange={setShowContextDrawer}>
          <SheetContent side="right" className="p-0 w-[340px]">
            <CrmContextPanel conversa={conversa} maeId={conversa?.maeId ?? null} className="w-full border-l-0" />
          </SheetContent>
        </Sheet>
      )}
      <SettingsDrawer open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
