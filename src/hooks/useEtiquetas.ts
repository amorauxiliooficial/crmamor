import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Etiqueta {
  id: string;
  nome: string;
  cor: string | null;
  created_at: string;
}

export function useEtiquetas() {
  return useQuery({
    queryKey: ["etiquetas"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("etiquetas")
        .select("*")
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Etiqueta[];
    },
    staleTime: 60_000,
  });
}

export function useCreateEtiqueta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nome: string; cor?: string | null }) => {
      const nome = input.nome.trim();
      if (!nome) throw new Error("Nome obrigatório");
      const { data, error } = await (supabase as any)
        .from("etiquetas")
        .insert({ nome, cor: input.cor ?? null })
        .select()
        .single();
      if (error) throw error;
      return data as Etiqueta;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["etiquetas"] }),
  });
}

export function useDeleteEtiqueta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("etiquetas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["etiquetas"] }),
  });
}
