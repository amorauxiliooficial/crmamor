import { useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WaConversation } from "@/hooks/useWhatsApp";

interface UseAtendimentoChannelParams {
  selectedId: string | null;
  selectedWa: WaConversation | undefined | null;
  aiEnabled: boolean;
  toast: (opts: any) => void;
  createEvent: { mutate: Function };
}

export function useAtendimentoChannel({
  selectedId,
  selectedWa,
  aiEnabled,
  toast,
  createEvent,
}: UseAtendimentoChannelParams) {
  const currentChannel = useMemo(() => {
    return (selectedWa as any)?.active_channel_code ?? (selectedWa as any)?.channel ?? "official";
  }, [selectedWa]);

  const currentInstanceId = useMemo(() => {
    return (selectedWa as any)?.instance_id ?? null;
  }, [selectedWa]);

  const handleChangeChannel = useCallback(async (newChannel: string) => {
    if (!selectedId) return;

    if (newChannel === "official" && currentChannel === "evolution") {
      const { transferConversationToOfficial } = await import("@/services/conversationTransfer");
      const result = await transferConversationToOfficial(selectedId);
      if (result.success) {
        toast({ title: "Voltou para canal Meta Oficial 📱" });
      } else {
        toast({ title: "Erro ao retornar", description: result.error, variant: "destructive" });
      }
      return;
    }

    const { error } = await supabase
      .from("wa_conversations")
      .update({ active_channel_code: newChannel, channel: newChannel } as any)
      .eq("id", selectedId);
    if (error) {
      toast({ title: "Erro ao mudar canal", variant: "destructive" });
    } else {
      toast({ title: newChannel === "web_manual_team" ? "Transferido para Web Manual 🌐" : "Voltou para Oficial 📱" });
      createEvent.mutate({
        conversation_id: selectedId,
        event_type: newChannel === "web_manual_team" ? "channel_to_web" : "channel_to_official",
      });
      if (newChannel === "web_manual_team" && aiEnabled) {
        const currentLabels: string[] = selectedWa?.labels ?? [];
        await supabase
          .from("wa_conversations")
          .update({ ai_enabled: false, labels: currentLabels.filter(l => l !== "AI_ON" && l !== "AI_PRIMARY") } as any)
          .eq("id", selectedId);
      }
    }
  }, [selectedId, selectedWa, aiEnabled, toast, createEvent, currentChannel]);

  return { currentChannel, currentInstanceId, handleChangeChannel };
}
