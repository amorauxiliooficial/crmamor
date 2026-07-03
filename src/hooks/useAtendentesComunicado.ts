import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AtendenteComunicado {
  id: string;
  nome: string;
  cargo: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export function useAtendentesComunicado() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["atendentes_comunicado"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atendentes_comunicado" as any)
        .select("*")
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data as any) as AtendenteComunicado[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (a: Partial<AtendenteComunicado> & { nome: string }) => {
      if (a.id) {
        const { error } = await supabase
          .from("atendentes_comunicado" as any)
          .update({ nome: a.nome, cargo: a.cargo ?? null, ativo: a.ativo ?? true })
          .eq("id", a.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("atendentes_comunicado" as any)
          .insert({ nome: a.nome, cargo: a.cargo ?? null, ativo: a.ativo ?? true });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atendentes_comunicado"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("atendentes_comunicado" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["atendentes_comunicado"] }),
  });

  return {
    atendentes: query.data ?? [],
    isLoading: query.isLoading,
    upsert,
    remove,
    refetch: query.refetch,
  };
}
