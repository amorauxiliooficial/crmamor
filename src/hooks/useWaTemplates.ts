import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WaTemplate {
  id: string;
  name: string;
  language_code: string;
  category: string;
  status: string;
  components_schema: any[];
  created_at: string;
  updated_at: string;
}

export function useWaTemplates() {
  return useQuery({
    queryKey: ["wa_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_templates" as any)
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as WaTemplate[];
    },
  });
}

export function useCreateWaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: Omit<WaTemplate, "id" | "created_at" | "updated_at">) => {
      const { error } = await supabase.from("wa_templates" as any).insert(t as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa_templates"] }),
  });
}

export function useUpdateWaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WaTemplate> & { id: string }) => {
      const { error } = await supabase.from("wa_templates" as any).update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa_templates"] }),
  });
}

export function useDeleteWaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wa_templates" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa_templates"] }),
  });
}

export function useSendTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      to: string;
      conversation_id: string;
      template_name: string;
      template_language: string;
      template_components?: any[];
      variables?: string[];
    }) => {
      const body: Record<string, any> = {
        to: params.to,
        conversation_id: params.conversation_id,
        type: "template",
        template_name: params.template_name,
        template_language: params.template_language,
      };
      if (params.variables) {
        body.variables = params.variables;
      } else if (params.template_components) {
        body.template_components = params.template_components;
      }
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["wa_conversations"] });
      qc.invalidateQueries({ queryKey: ["wa_messages", variables.conversation_id] });
    },
  });
}
