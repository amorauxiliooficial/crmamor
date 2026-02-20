import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TimelineEvent {
  id: string;
  mae_id: string | null;
  conversation_id: string | null;
  event_type: string;
  title: string;
  payload: Record<string, unknown>;
  created_at: string;
  created_by: string | null;
}

async function fetchTimelineByMae(maeId: string): Promise<TimelineEvent[]> {
  const { data, error } = await supabase
    .from("timeline_events")
    .select("*")
    .eq("mae_id", maeId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data || []) as TimelineEvent[];
}

export function useTimelineEvents(maeId: string | null) {
  return useQuery({
    queryKey: ["timeline_events", maeId],
    queryFn: () => fetchTimelineByMae(maeId!),
    enabled: !!maeId,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });
}

export function useTimelineActions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const addEvent = async (params: {
    mae_id?: string | null;
    conversation_id?: string | null;
    event_type: string;
    title: string;
    payload?: Record<string, unknown>;
  }) => {
    if (!user) return null;

    const insertData = {
      mae_id: params.mae_id || null,
      conversation_id: params.conversation_id || null,
      event_type: params.event_type,
      title: params.title,
      payload: (params.payload || {}) as import("@/integrations/supabase/types").Json,
      created_by: user.id,
    };

    const { data, error } = await supabase
      .from("timeline_events")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Failed to add timeline event:", error);
      return null;
    }

    // Update last_contact_at on mae if it's a contact event
    if (params.mae_id && ["message_sent", "message_received", "whatsapp_sent", "whatsapp_received"].includes(params.event_type)) {
      await supabase
        .from("mae_processo")
        .update({ last_contact_at: new Date().toISOString() })
        .eq("id", params.mae_id);
    }

    // Invalidate relevant queries
    if (params.mae_id) {
      queryClient.invalidateQueries({ queryKey: ["timeline_events", params.mae_id] });
    }

    return data;
  };

  return { addEvent };
}
