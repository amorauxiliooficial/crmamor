import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { TemplateComunicado } from "@/types/banco";

async function fetchTemplates(): Promise<TemplateComunicado[]> {
  const { data, error } = await supabase
    .from("templates_comunicado")
    .select("*")
    .eq("ativo", true)
    .order("nome", { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export function useTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["templates_comunicado"],
    queryFn: fetchTemplates,
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["templates_comunicado"] });
  };

  return {
    templates: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch,
  };
}
