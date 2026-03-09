import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveAiAgents } from "@/hooks/useAiAgents";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useDebouncedCallback } from "use-debounce";
import { useQuery } from "@tanstack/react-query";
import { useInboundNotification } from "@/hooks/useInboundNotification";
import { useWaConversations, useWaMessages, useSendWhatsApp, useRetryWhatsApp, useMarkConversationRead, useUpdateConversationStatus, useEditMessage, useAssumeConversation, useTransferConversation, useCloseConversation, useReopenConversation, type WaConversation } from "@/hooks/useWhatsApp";
import { useConversationEvents, useCreateConversationEvent } from "@/hooks/useConversationEvents";
import { useRealtimeConnection } from "@/hooks/useRealtimeConnection";
import { respostasRapidas } from "@/data/respostasRapidas";
import { InboxSidebar } from "@/components/atendimento/InboxSidebar";
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

// Convert WA data to existing UI types
function waToConversa(wa: WaConversation, profileMap: Map<string, string>): Conversa {
  const statusMap: Record<string, "Aberto" | "Pendente" | "Fechado"> = {
    open: "Aberto",
    pending: "Pendente",
    closed: "Fechado",
  };
  const assignedName = wa.assigned_to ? profileMap.get(wa.assigned_to) ?? null : null;

  // Derive queue status
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
    telefone: wa.wa_phone.startsWith("+") ? wa.wa_phone : `+${wa.wa_phone}`,
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

type TabFilter = "nao_lidas" | "Aberto" | "Pendente" | "Fechado";

export default function Atendimento() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { recordAssignment } = useAssignmentActions();
  const { addEvent } = useTimelineActions();

  // Real WhatsApp data
  const { data: waConversations, isLoading: loadingConvos } = useWaConversations();
  const [selectedId, setSelectedId] = useState<string | null>(routeId ?? null);
  const { data: waMessages, isLoading: loadingMsgs } = useWaMessages(selectedId);
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
  const { data: conversationEvents } = useConversationEvents(selectedId);
  const { soundEnabled, autoplayBlocked, intensity, toggleSound, changeIntensity, playNotification, requestPermission, setActiveConversation } = useInboundNotification();

  // Request browser notification permission on mount
  useEffect(() => { requestPermission(); }, [requestPermission]);

  // Track active conversation for focus-aware notifications
  useEffect(() => {
    setActiveConversation(selectedId);
  }, [selectedId, setActiveConversation]);

  // Realtime listener for inbound messages – plays notification sound + visual alerts
  useEffect(() => {
    const channel = supabase
      .channel("inbound_notification")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "wa_messages",
          filter: "direction=eq.in",
        },
        (payload: any) => {
          const convId = payload.new?.conversation_id;
          const body = payload.new?.body;
          // Find conversation name
          const conv = (waConversations ?? []).find((c) => c.id === convId);
          const contactName = conv?.wa_name || undefined;
          const preview = body?.slice(0, 80) || undefined;
          playNotification(contactName, preview, convId);

          // Show in-app toast for better visibility
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

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TabFilter | null>(null);
  const [atendenteFilter, setAtendenteFilter] = useState<"todos" | "meus">("todos");
  const [msgText, setMsgText] = useState("");
  const [showContext, setShowContext] = useState(false);
  const [showContextDrawer, setShowContextDrawer] = useState(false);
  const [mobileCrmDrawerOpen, setMobileCrmDrawerOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("conversas");
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
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

  useEffect(() => {
    if (routeId) setSelectedId(routeId);
  }, [routeId]);

  // Convert WA conversations to UI format
  const conversas: Conversa[] = useMemo(() => {
    return (waConversations ?? []).map((wa) => waToConversa(wa, profileMap));
  }, [waConversations, profileMap]);

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

  const conversa = selectedId ? conversas.find((c) => c.id === selectedId) ?? null : null;
  const selectedWa = selectedId ? (waConversations ?? []).find((c) => c.id === selectedId) : null;

  // Mark as read when selecting conversation
  useEffect(() => {
    if (selectedId && conversa && conversa.naoLidas > 0) {
      markRead.mutate(selectedId);
    }
  }, [selectedId]);

  const selectConversa = useCallback(
    (id: string) => {
      setSelectedId(id);
      navigate(`/atendimento/chat/${id}`, { replace: true });
    },
    [navigate]
  );

  const handleAssume = useCallback(
    (id?: string) => {
      const target = id || selectedId;
      if (!target) return;
      assumeConversation.mutate(target, {
        onSuccess: () => {
          toast({ title: "Conversa assumida ✅" });
          createEvent.mutate({ conversation_id: target, event_type: "assumed", to_agent_id: user?.id });
          recordAssignment.mutate({
            conversation_id: target,
            from_user_id: null,
            to_user_id: user?.id,
            reason: "Conversa assumida manualmente",
          });
        },
      });
    },
    [selectedId, toast, recordAssignment, user, assumeConversation, createEvent]
  );

  const DEFAULT_GREETING = "Olá! Tudo bem? Sou atendente da equipe. Como posso te ajudar hoje? 😊";

  const handleStartAtendimento = useCallback(
    (id: string) => {
      assumeConversation.mutate(id, {
        onSuccess: () => {
          toast({ title: "Atendimento iniciado ✅" });
          createEvent.mutate({ conversation_id: id, event_type: "assumed", to_agent_id: user?.id });
          recordAssignment.mutate({
            conversation_id: id,
            from_user_id: null,
            to_user_id: user?.id,
            reason: "Atendimento iniciado via fila",
          });
          setSelectedId(id);
          navigate(`/atendimento/chat/${id}`, { replace: true });
          setMsgText(DEFAULT_GREETING);
        },
      });
    },
    [toast, recordAssignment, user, assumeConversation, createEvent, navigate]
  );

  const handleTransfer = useCallback(
    (toAgentId: string, reason?: string) => {
      if (!selectedId) return;
      transferConversation.mutate(
        { conversationId: selectedId, toAgentId, reason },
        {
          onSuccess: () => {
            toast({ title: "Atendimento transferido ✅" });
            setTransferDialogOpen(false);
            createEvent.mutate({
              conversation_id: selectedId,
              event_type: "transfer",
              from_agent_id: conversa?.assignedAgentId,
              to_agent_id: toAgentId,
              meta: reason ? { reason } : {},
            });
          },
          onError: () => {
            toast({ title: "Erro ao transferir", variant: "destructive" });
          },
        }
      );
    },
    [selectedId, toast, transferConversation, createEvent, conversa]
  );

  const handlePendente = useCallback(
    (id?: string) => {
      const target = id || selectedId;
      if (!target) return;
      updateStatus.mutate({ id: target, status: "pending" });
    },
    [selectedId, updateStatus]
  );

  const handleFinalizar = useCallback(
    (id?: string) => {
      const target = id || selectedId;
      if (!target) return;
      closeConversation.mutate({ conversationId: target }, {
        onSuccess: () => {
          toast({ title: "Atendimento finalizado ✅" });
          createEvent.mutate({ conversation_id: target, event_type: "closed" });
        },
      });
    },
    [selectedId, toast, closeConversation, createEvent]
  );

  const handleReopen = useCallback(() => {
    if (!selectedId) return;
    reopenConversation.mutate(selectedId, {
      onSuccess: () => {
        toast({ title: "Conversa reaberta ✅" });
        createEvent.mutate({ conversation_id: selectedId, event_type: "reopened" });
      },
    });
  }, [selectedId, toast, reopenConversation, createEvent]);

  const toggleEtiqueta = useCallback(
    (etiqueta: string) => {
      // Labels are stored in wa_conversations but for now we keep local behavior
      // TODO: persist labels to DB
    },
    [selectedId]
  );

  // AI agents list
  const { data: aiAgents } = useActiveAiAgents();

  // AI toggle: use ai_enabled column + legacy labels
  const aiEnabled = useMemo(() => {
    if (!selectedWa) return false;
    return (selectedWa as any).ai_enabled === true || (selectedWa?.labels ?? []).includes("AI_ON");
  }, [selectedWa]);

  const selectedAiAgentId = useMemo(() => {
    return (selectedWa as any)?.ai_agent_id ?? null;
  }, [selectedWa]);

  const handleToggleAi = useCallback(async () => {
    if (!selectedId || !selectedWa) return;
    const newEnabled = !aiEnabled;
    const currentLabels: string[] = selectedWa.labels ?? [];
    let newLabels = currentLabels;
    if (newEnabled) {
      newLabels = [...currentLabels.filter(l => l !== "HANDOFF_HUMAN" && l !== "AI_PAUSED"), "AI_ON"];
    } else {
      newLabels = currentLabels.filter(l => l !== "AI_ON" && l !== "AI_PRIMARY");
    }
    const { error } = await supabase
      .from("wa_conversations")
      .update({ ai_enabled: newEnabled, labels: newLabels } as any)
      .eq("id", selectedId);
    if (error) {
      toast({ title: "Erro ao atualizar IA", variant: "destructive" });
    } else {
      toast({ title: newEnabled ? "IA ativada 🤖" : "IA desativada" });
      createEvent.mutate({
        conversation_id: selectedId,
        event_type: newEnabled ? "ai_enabled" : "ai_disabled",
      });
    }
  }, [selectedId, selectedWa, aiEnabled, toast, createEvent]);

  const handleChangeAiAgent = useCallback(async (agentId: string | null) => {
    if (!selectedId) return;
    const { error } = await supabase
      .from("wa_conversations")
      .update({ ai_agent_id: agentId } as any)
      .eq("id", selectedId);
    if (error) {
      toast({ title: "Erro ao mudar agente", variant: "destructive" });
    } else {
      const agentName = aiAgents?.find(a => a.id === agentId)?.name || "Padrão";
      toast({ title: `Agente alterado para ${agentName} 🤖` });
    }
  }, [selectedId, aiAgents, toast]);

  const currentChannel = useMemo(() => {
    return (selectedWa as any)?.channel ?? "official";
  }, [selectedWa]);

  const handleChangeChannel = useCallback(async (newChannel: string) => {
    if (!selectedId) return;
    const { error } = await supabase
      .from("wa_conversations")
      .update({ channel: newChannel } as any)
      .eq("id", selectedId);
    if (error) {
      toast({ title: "Erro ao mudar canal", variant: "destructive" });
    } else {
      toast({ title: newChannel === "web" ? "Transferido para Web 🌐" : "Voltou para Oficial 📱" });
      createEvent.mutate({
        conversation_id: selectedId,
        event_type: newChannel === "web" ? "channel_to_web" : "channel_to_official",
      });
      // Disable AI when switching to web
      if (newChannel === "web" && aiEnabled) {
        const currentLabels: string[] = selectedWa?.labels ?? [];
        await supabase
          .from("wa_conversations")
          .update({ ai_enabled: false, labels: currentLabels.filter(l => l !== "AI_ON" && l !== "AI_PRIMARY") } as any)
          .eq("id", selectedId);
      }
    }
  }, [selectedId, selectedWa, aiEnabled, toast, createEvent]);

  const handleSend = useCallback(() => {
    if (!selectedId || !msgText.trim() || !selectedWa) return;
    const text = msgText.trim();
    sendWhatsApp.mutate(
      { to: selectedWa.wa_phone, text, conversation_id: selectedId },
      {
        onError: (err) => {
          console.error("Send error:", err);
          toast({ title: "Erro ao enviar", description: "Tente novamente.", variant: "destructive" });
        },
      }
    );
    setMsgText("");
  }, [selectedId, msgText, selectedWa, sendWhatsApp, toast]);

  const handleSendMedia = useCallback(async (file: File) => {
    if (!selectedId || !selectedWa) return;

    try {
      // Upload to wa-media bucket
      const ext = file.name.split('.').pop() || 'bin';
      const path = `outbound/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      
      const { error: uploadErr } = await supabase.storage
        .from('wa-media')
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('wa-media').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      // Determine type
      let msgType = 'document';
      if (file.type.startsWith('image/')) msgType = 'image';
      else if (file.type.startsWith('video/')) msgType = 'video';
      else if (file.type.startsWith('audio/')) msgType = 'audio';

      sendWhatsApp.mutate(
        {
          to: selectedWa.wa_phone,
          conversation_id: selectedId,
          type: msgType,
          media_url: publicUrl,
          media_mime: file.type,
          media_filename: file.name,
          caption: msgText.trim() || undefined,
        },
        {
          onError: (err) => {
            console.error("Send media error:", err);
            toast({ title: "Erro ao enviar mídia", description: "Tente novamente.", variant: "destructive" });
          },
        }
      );
      setMsgText("");
    } catch (err) {
      console.error("Upload error:", err);
      toast({ title: "Erro ao fazer upload", description: "Tente novamente.", variant: "destructive" });
    }
  }, [selectedId, selectedWa, sendWhatsApp, msgText, toast]);

  const handleRetry = useCallback((messageId: string, body: string, msgType?: string, mediaUrl?: string, mediaMime?: string, mediaFilename?: string) => {
    if (!selectedId || !selectedWa) return;
    retryWhatsApp.mutate(
      {
        messageId,
        to: selectedWa.wa_phone,
        text: msgType === 'text' || !msgType ? body : undefined,
        conversation_id: selectedId,
        type: msgType,
        media_url: mediaUrl,
        media_mime: mediaMime,
        media_filename: mediaFilename,
      },
      {
        onSuccess: () => toast({ title: "Mensagem reenviada ✅" }),
        onError: (err) => {
          console.error("Retry error:", err);
          toast({ title: "Falha ao reenviar", description: "Tente novamente.", variant: "destructive" });
        },
      }
    );
  }, [selectedId, selectedWa, retryWhatsApp, toast]);

  // Sort: by last_message_at desc
  const sortedConversas = useMemo(() => {
    return [...conversas].sort((a, b) => {
      if (a.prioridade === "alta" && b.prioridade !== "alta") return -1;
      if (b.prioridade === "alta" && a.prioridade !== "alta") return 1;
      return b.horario.getTime() - a.horario.getTime();
    });
  }, [conversas]);

  const unreadCount = useMemo(() => conversas.filter((c) => c.naoLidas > 0).length, [conversas]);

  if (loading || !user) return null;

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
              <ChatPanel
                conversa={conversa}
                mensagens={msgs}
                isMobile
                msgText={msgText}
                onMsgTextChange={setMsgText}
                onSend={handleSend}
                onSendMedia={handleSendMedia}
                onRetry={handleRetry}
                onBack={() => { setSelectedId(null); navigate("/atendimento"); }}
                onAssume={() => handleAssume()}
                onPendente={() => handlePendente()}
                onFinalizar={() => handleFinalizar()}
                onTransfer={() => setTransferDialogOpen(true)}
                onToggleEtiqueta={toggleEtiqueta}
                respostas={respostasRapidas}
                onToggleContext={() => setMobileCrmDrawerOpen(true)}
                isLoadingMessages={loadingMsgs}
                currentUserId={user?.id ?? null}
                onEditMessage={(messageId, newBody) => {
                  if (!selectedId) return;
                  editMessage.mutate({ messageId, newBody, conversationId: selectedId }, {
                    onSuccess: () => toast({ title: "Mensagem editada ✅" }),
                    onError: (err: any) => toast({ title: "Erro ao editar", description: err?.message?.includes("row-level") ? "Permissão negada ou tempo expirado" : "Tente novamente.", variant: "destructive" }),
                  });
                }}
                soundEnabled={soundEnabled}
                autoplayBlocked={autoplayBlocked}
                onToggleSound={toggleSound}
                onReopen={handleReopen}
                connectionStatus={connectionStatus}
                onReconnect={onReconnect}
                conversationEvents={conversationEvents ?? []}
                profileMap={profileMap}
                aiEnabled={aiEnabled}
                onToggleAi={handleToggleAi}
                aiAgents={aiAgents ?? []}
                selectedAiAgentId={selectedAiAgentId}
                onChangeAiAgent={handleChangeAiAgent}
                lastInboundAt={conversa?.lastInboundAt}
                conversationPhone={selectedWa?.wa_phone}
                channel={currentChannel}
                onChangeChannel={handleChangeChannel}
              />
              <Drawer open={mobileCrmDrawerOpen} onOpenChange={setMobileCrmDrawerOpen}>
                <DrawerContent className="max-h-[85dvh]">
                  <CrmContextPanel
                    conversa={conversa}
                    maeId={conversa?.maeId ?? null}
                    className="w-full border-l-0 h-auto max-h-[80dvh]"
                  />
                </DrawerContent>
              </Drawer>
              <TransferDialog
                open={transferDialogOpen}
                onOpenChange={setTransferDialogOpen}
                onTransfer={handleTransfer}
                currentAgentId={conversa?.assignedAgentId}
                isLoading={transferConversation.isPending}
              />
            </>
          ) : mobileTab === "conversas" ? (
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
          ) : mobileTab === "kanban" ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Kanban</p>
                <p className="text-xs text-muted-foreground/60">Acesse o painel principal para a visão completa</p>
                <button onClick={() => navigate("/")} className="text-xs text-primary font-medium">
                  Ir para o Painel →
                </button>
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
          <MobileBottomNav
            activeTab={mobileTab}
            onTabChange={setMobileTab}
            onOpenCrmDrawer={() => setMobileCrmDrawerOpen(true)}
            showCrmButton={!!selectedId}
            unreadCount={unreadCount}
          />
        )}

        {!(selectedId && mobileTab === "conversas") && (
          <div className="h-[56px] shrink-0" />
        )}
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

      <ChatPanel
        conversa={conversa}
        mensagens={msgs}
        isMobile={false}
        msgText={msgText}
        onMsgTextChange={setMsgText}
        onSend={handleSend}
        onSendMedia={handleSendMedia}
        onRetry={handleRetry}
        onBack={() => {}}
        onAssume={() => handleAssume()}
        onPendente={() => handlePendente()}
        onFinalizar={() => handleFinalizar()}
        onTransfer={() => setTransferDialogOpen(true)}
        onToggleEtiqueta={toggleEtiqueta}
        respostas={respostasRapidas}
        showContext={showContext}
        onToggleContext={() => {
          if (isTablet) {
            setShowContextDrawer(!showContextDrawer);
          } else {
            setShowContext(!showContext);
          }
        }}
        isLoadingMessages={loadingMsgs}
        currentUserId={user?.id ?? null}
        onEditMessage={(messageId, newBody) => {
          if (!selectedId) return;
          editMessage.mutate({ messageId, newBody, conversationId: selectedId }, {
            onSuccess: () => toast({ title: "Mensagem editada ✅" }),
            onError: (err: any) => toast({ title: "Erro ao editar", description: err?.message?.includes("row-level") ? "Permissão negada ou tempo expirado" : "Tente novamente.", variant: "destructive" }),
          });
        }}
        soundEnabled={soundEnabled}
        autoplayBlocked={autoplayBlocked}
        onToggleSound={toggleSound}
        onReopen={handleReopen}
        connectionStatus={connectionStatus}
        onReconnect={onReconnect}
        conversationEvents={conversationEvents ?? []}
        profileMap={profileMap}
        aiEnabled={aiEnabled}
        onToggleAi={handleToggleAi}
        aiAgents={aiAgents ?? []}
        selectedAiAgentId={selectedAiAgentId}
        onChangeAiAgent={handleChangeAiAgent}
        lastInboundAt={conversa?.lastInboundAt}
        conversationPhone={selectedWa?.wa_phone}
        channel={currentChannel}
        onChangeChannel={handleChangeChannel}
      />

      <TransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        onTransfer={handleTransfer}
        currentAgentId={conversa?.assignedAgentId}
        isLoading={transferConversation.isPending}
      />

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
