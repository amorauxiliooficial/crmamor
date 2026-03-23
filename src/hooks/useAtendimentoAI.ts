import { useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveAiAgents, type AiAgent } from "@/hooks/useAiAgents";
import type { WaConversation } from "@/hooks/useWhatsApp";

interface UseAtendimentoAIParams {
  selectedId: string | null;
  selectedWa: WaConversation | undefined | null;
  toast: (opts: any) => void;
  createEvent: { mutate: Function };
}

export function useAtendimentoAI({
  selectedId,
  selectedWa,
  toast,
  createEvent,
}: UseAtendimentoAIParams) {
  const { data: aiAgents } = useActiveAiAgents();

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

  return {
    aiEnabled,
    aiAgents: aiAgents ?? [] as AiAgent[],
    selectedAiAgentId,
    handleToggleAi,
    handleChangeAiAgent,
  };
}
