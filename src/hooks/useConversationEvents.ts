import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ConversationEvent {
  id: string;
  conversation_id: string;
  event_type: string; // 'assumed' | 'transfer' | 'closed' | 'reopened' | 'status_change'
  from_agent_id: string | null;
  to_agent_id: string | null;
  meta: Record<string, unknown>;
  created_by_agent_id: string | null;
  created_at: string;
}

export function useConversationEvents(conversationId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["conversation_events", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from("conversation_events")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ConversationEvent[];
    },
    enabled: !!conversationId,
    staleTime: 1000 * 60 * 2,
  });

  // Realtime
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`conv_events_${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_events",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversation_events", conversationId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, queryClient]);

  return query;
}

export function useCreateConversationEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      conversation_id: string;
      event_type: string;
      from_agent_id?: string | null;
      to_agent_id?: string | null;
      meta?: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("conversation_events")
        .insert({
          conversation_id: params.conversation_id,
          event_type: params.event_type,
          from_agent_id: params.from_agent_id || null,
          to_agent_id: params.to_agent_id || null,
          meta: (params.meta || {}) as any,
          created_by_agent_id: user.id,
        } as any);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversation_events", variables.conversation_id] });
    },
  });
}
