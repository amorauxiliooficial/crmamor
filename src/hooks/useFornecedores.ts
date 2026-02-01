import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import type { Fornecedor } from "@/types/fornecedor";

async function fetchFornecedores(): Promise<Fornecedor[]> {
  const { data, error } = await supabase
    .from("fornecedores")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export function useFornecedores() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["fornecedores"],
    queryFn: fetchFornecedores,
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("fornecedores-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fornecedores",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const createFornecedor = useMutation({
    mutationFn: async (fornecedor: Omit<Fornecedor, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("fornecedores")
        .insert(fornecedor as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      toast({ title: "Sucesso", description: "Fornecedor cadastrado com sucesso" });
    },
    onError: (error: any) => {
      logError("createFornecedor", error);
      const message = error?.message?.includes("fornecedores_nome_unique")
        ? "Já existe um fornecedor com este nome."
        : getUserFriendlyError(error);
      toast({ variant: "destructive", title: "Erro", description: message });
    },
  });

  const updateFornecedor = useMutation({
    mutationFn: async ({ id, ...fornecedor }: Partial<Fornecedor> & { id: string }) => {
      const { data, error } = await supabase
        .from("fornecedores")
        .update(fornecedor as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      toast({ title: "Sucesso", description: "Fornecedor atualizado com sucesso" });
    },
    onError: (error: any) => {
      logError("updateFornecedor", error);
      const message = error?.message?.includes("fornecedores_nome_unique")
        ? "Já existe um fornecedor com este nome."
        : getUserFriendlyError(error);
      toast({ variant: "destructive", title: "Erro", description: message });
    },
  });

  const deleteFornecedor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fornecedores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      toast({ title: "Sucesso", description: "Fornecedor excluído com sucesso" });
    },
    onError: (error: any) => {
      logError("deleteFornecedor", error);
      toast({ variant: "destructive", title: "Erro", description: getUserFriendlyError(error) });
    },
  });

  return {
    fornecedores: query.data || [],
    fornecedoresAtivos: (query.data || []).filter((f) => f.ativo),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: () => queryClient.invalidateQueries({ queryKey: ["fornecedores"] }),
    createFornecedor,
    updateFornecedor,
    deleteFornecedor,
  };
}
