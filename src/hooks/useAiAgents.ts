import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AiAgent {
  id: string;
  name: string;
  model: string;
  tone: string;
  max_tokens: number;
  departments: string[];
  system_prompt: string;
  knowledge_instructions: string;
  knowledge_faq: { question: string; answer: string }[];
  knowledge_links: string[];
  tools_config: Record<string, boolean>;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type AiAgentInsert = Omit<AiAgent, "id" | "created_at" | "updated_at">;

const TABLE = "ai_agents";

export function useAiAgents() {
  return useQuery({
    queryKey: [TABLE],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as any)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AiAgent[];
    },
  });
}

export function useActiveAiAgents() {
  return useQuery({
    queryKey: [TABLE, "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as any)
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as AiAgent[];
    },
  });
}

export function useCreateAiAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (agent: Partial<AiAgentInsert>) => {
      const { data, error } = await supabase
        .from(TABLE as any)
        .insert(agent as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AiAgent;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [TABLE] }),
  });
}

export function useUpdateAiAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AiAgent> & { id: string }) => {
      const { data, error } = await supabase
        .from(TABLE as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AiAgent;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [TABLE] }),
  });
}

export function useDeleteAiAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [TABLE] }),
  });
}

export function useSetDefaultAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (agentId: string) => {
      // Remove default from all
      await supabase.from(TABLE as any).update({ is_default: false } as any).neq("id", agentId);
      // Set default
      const { error } = await supabase
        .from(TABLE as any)
        .update({ is_default: true } as any)
        .eq("id", agentId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [TABLE] }),
  });
}
