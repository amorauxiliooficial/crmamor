import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AssignmentEvent {
  id: string;
  mae_id: string | null;
  conversation_id: string | null;
  from_user_id: string | null;
  to_user_id: string | null;
  reason: string | null;
  summary: string | null;
  created_at: string;
  created_by: string | null;
}

export function useAssignmentEvents(maeId: string | null) {
  return useQuery({
    queryKey: ["assignment_events", maeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment_events")
        .select("*")
        .eq("mae_id", maeId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as AssignmentEvent[];
    },
    enabled: !!maeId,
  });
}

export function useAssignmentActions() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const recordAssignment = useMutation({
    mutationFn: async (params: {
      mae_id?: string | null;
      conversation_id?: string | null;
      from_user_id?: string | null;
      to_user_id?: string | null;
      reason?: string;
      summary?: string;
    }) => {
      const { data, error } = await supabase
        .from("assignment_events")
        .insert({
          mae_id: params.mae_id || null,
          conversation_id: params.conversation_id || null,
          from_user_id: params.from_user_id || null,
          to_user_id: params.to_user_id || null,
          reason: params.reason || null,
          summary: params.summary || null,
          created_by: user?.id || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      if (vars.mae_id) {
        qc.invalidateQueries({ queryKey: ["assignment_events", vars.mae_id] });
        qc.invalidateQueries({ queryKey: ["timeline_events", vars.mae_id] });
      }
    },
  });

  return { recordAssignment };
}
