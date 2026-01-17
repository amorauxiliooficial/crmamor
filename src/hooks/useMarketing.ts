import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TipoConteudo, Criativo, TipoInstagram } from "@/types/marketing";
import { toast } from "@/hooks/use-toast";

export function useTiposConteudo() {
  return useQuery({
    queryKey: ["tipos-conteudo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tipos_conteudo")
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      return data as TipoConteudo[];
    },
  });
}

export function useCriativos(mes?: Date) {
  return useQuery({
    queryKey: ["criativos", mes?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("criativos")
        .select(`
          *,
          tipo_conteudo:tipos_conteudo(*)
        `)
        .order("data_postagem", { ascending: true });

      if (mes) {
        const inicioMes = new Date(mes.getFullYear(), mes.getMonth(), 1);
        const fimMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
        query = query
          .gte("data_postagem", inicioMes.toISOString().split("T")[0])
          .lte("data_postagem", fimMes.toISOString().split("T")[0]);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Criativo[];
    },
  });
}

interface CriativoInput {
  titulo: string;
  descricao?: string;
  tipo_conteudo_id?: string;
  tipo_instagram: TipoInstagram;
  data_postagem: string;
  horario_postagem?: string;
  legenda?: string;
  arquivo_url?: string;
  status?: string;
}

export function useCreateCriativo() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CriativoInput) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("criativos")
        .insert({
          ...input,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["criativos"] });
      toast({
        title: "Criativo agendado",
        description: "O conteúdo foi adicionado ao calendário.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao agendar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateCriativo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<CriativoInput>) => {
      const { data, error } = await supabase
        .from("criativos")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["criativos"] });
      toast({
        title: "Criativo atualizado",
        description: "As alterações foram salvas.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteCriativo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("criativos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["criativos"] });
      toast({
        title: "Criativo removido",
        description: "O conteúdo foi removido do calendário.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
