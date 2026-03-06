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
  published_config: Record<string, unknown> | null;
  published_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export type AiAgentInsert = Omit<AiAgent, "id" | "created_at" | "updated_at" | "published_config" | "published_at" | "version">;

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

export function usePublishAiAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (agentId: string) => {
      // Fetch current draft
      const { data: agent, error: fetchErr } = await supabase
        .from(TABLE as any)
        .select("*")
        .eq("id", agentId)
        .single();
      if (fetchErr || !agent) throw new Error("Agent not found");

      const a = agent as any;
      const publishedConfig = {
        name: a.name,
        model: a.model,
        tone: a.tone,
        max_tokens: a.max_tokens,
        departments: a.departments,
        system_prompt: a.system_prompt,
        knowledge_instructions: a.knowledge_instructions,
        knowledge_faq: a.knowledge_faq,
        knowledge_links: a.knowledge_links,
        tools_config: a.tools_config,
      };

      const { data, error } = await supabase
        .from(TABLE as any)
        .update({
          published_config: publishedConfig,
          published_at: new Date().toISOString(),
          version: (a.version || 1) + 1,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", agentId)
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
      await supabase.from(TABLE as any).update({ is_default: false } as any).neq("id", agentId);
      const { error } = await supabase
        .from(TABLE as any)
        .update({ is_default: true } as any)
        .eq("id", agentId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [TABLE] }),
  });
}
