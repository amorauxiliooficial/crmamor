import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Despesa, CategoriaDespesa, StatusTransacao, TipoRecorrencia } from "@/types/despesa";

async function fetchDespesas(): Promise<Despesa[]> {
  const { data, error } = await supabase
    .from("despesas")
    .select("*")
    .order("data_vencimento", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((d) => ({
    ...d,
    categoria: d.categoria as CategoriaDespesa,
    status: d.status as StatusTransacao,
    recorrencia: d.recorrencia as TipoRecorrencia,
  }));
}

export function useDespesas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["despesas"],
    queryFn: fetchDespesas,
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("despesas-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "despesas",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["despesas"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const createDespesa = useMutation({
    mutationFn: async (despesa: Omit<Despesa, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("despesas")
        .insert(despesa as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["despesas"] });
      toast({ title: "Sucesso", description: "Despesa cadastrada com sucesso" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  const updateDespesa = useMutation({
    mutationFn: async ({ id, ...despesa }: Partial<Despesa> & { id: string }) => {
      const { data, error } = await supabase
        .from("despesas")
        .update(despesa as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["despesas"] });
      toast({ title: "Sucesso", description: "Despesa atualizada com sucesso" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  const deleteDespesa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("despesas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["despesas"] });
      toast({ title: "Sucesso", description: "Despesa excluída com sucesso" });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    },
  });

  return {
    despesas: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: () => queryClient.invalidateQueries({ queryKey: ["despesas"] }),
    createDespesa,
    updateDespesa,
    deleteDespesa,
  };
}
