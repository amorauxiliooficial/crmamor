import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { WaConversation } from "@/hooks/useWhatsApp";
import type { Conversa } from "@/data/atendimentoMock";

interface UseAtendimentoConversationParams {
  waConversations: WaConversation[] | undefined;
  conversas: Conversa[];
  user: { id: string } | null;
  toast: (opts: any) => void;
  assumeConversation: { mutate: Function };
  transferConversation: { mutate: Function; isPending: boolean };
  closeConversation: { mutate: Function };
  reopenConversation: { mutate: Function };
  updateStatus: { mutate: Function };
  createEvent: { mutate: Function };
  recordAssignment: { mutate: Function };
  setMsgText: (t: string) => void;
}

const DEFAULT_GREETING = "Olá! Tudo bem? Sou atendente da equipe. Como posso te ajudar hoje? 😊";

export function useAtendimentoConversation({
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
  setMsgText,
}: UseAtendimentoConversationParams) {
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  const [selectedId, setSelectedId] = useState<string | null>(routeId ?? null);

  useEffect(() => {
    if (routeId) setSelectedId(routeId);
  }, [routeId]);

  const conversa = selectedId ? conversas.find((c) => c.id === selectedId) ?? null : null;
  const selectedWa = selectedId ? (waConversations ?? []).find((c) => c.id === selectedId) : null;

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
    [toast, recordAssignment, user, assumeConversation, createEvent, navigate, setMsgText]
  );

  const handleTransfer = useCallback(
    (toAgentId: string, reason?: string) => {
      if (!selectedId) return;
      transferConversation.mutate(
        { conversationId: selectedId, toAgentId, reason },
        {
          onSuccess: () => {
            toast({ title: "Atendimento transferido ✅" });
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
    (_etiqueta: string) => {
      // Labels stored in wa_conversations - TODO: persist to DB
    },
    [selectedId]
  );

  return {
    selectedId,
    setSelectedId,
    conversa,
    selectedWa,
    selectConversa,
    handleAssume,
    handleStartAtendimento,
    handleTransfer,
    handlePendente,
    handleFinalizar,
    handleReopen,
    toggleEtiqueta,
  };
}
