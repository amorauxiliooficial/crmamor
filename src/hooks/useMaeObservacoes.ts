import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type ObservacaoCategoria =
  | "ligacao"
  | "whatsapp"
  | "documento"
  | "reuniao"
  | "importado"
  | "outro";

export interface MaeObservacao {
  id: string;
  mae_id: string;
  autor_id: string | null;
  autor_nome: string;
  texto: string;
  categoria: ObservacaoCategoria;
  fixada: boolean;
  editada_em: string | null;
  editada_por: string | null;
  excluida_em: string | null;
  excluida_por: string | null;
  created_at: string;
  updated_at: string;
}

export const CATEGORIA_LABEL: Record<ObservacaoCategoria, string> = {
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  documento: "Documento",
  reuniao: "Reunião",
  importado: "Importado",
  outro: "Outro",
};

export const CATEGORIA_COLORS: Record<ObservacaoCategoria, string> = {
  ligacao: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  whatsapp: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30",
  documento: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  reuniao: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  importado: "bg-muted text-muted-foreground border-border",
  outro: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30",
};

export function useMaeObservacoes(maeId: string | null | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["mae_observacoes", maeId];

  const query = useQuery({
    queryKey: key,
    enabled: !!maeId,
    queryFn: async (): Promise<MaeObservacao[]> => {
      const { data, error } = await supabase
        .from("mae_observacoes")
        .select("*")
        .eq("mae_id", maeId!)
        .is("excluida_em", null)
        .order("fixada", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as MaeObservacao[];
    },
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (!maeId) return;
    const channel = supabase
      .channel(`mae_observacoes_${maeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mae_observacoes", filter: `mae_id=eq.${maeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: key });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maeId]);

  const create = useMutation({
    mutationFn: async (input: { texto: string; categoria: ObservacaoCategoria; fixada?: boolean }) => {
      if (!user || !maeId) throw new Error("Sem usuário/mãe");
      // Get autor_nome
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();
      const autor_nome = profile?.full_name || profile?.email || "Atendente";
      const { error } = await supabase.from("mae_observacoes").insert({
        mae_id: maeId,
        autor_id: user.id,
        autor_nome,
        texto: input.texto.trim(),
        categoria: input.categoria,
        fixada: input.fixada ?? false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anotação adicionada");
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ["maes_data"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao adicionar"),
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; texto: string; categoria: ObservacaoCategoria }) => {
      if (!user) throw new Error("Sem usuário");
      const { error } = await supabase
        .from("mae_observacoes")
        .update({
          texto: input.texto.trim(),
          categoria: input.categoria,
          editada_em: new Date().toISOString(),
          editada_por: user.id,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anotação atualizada");
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar"),
  });

  const togglePin = useMutation({
    mutationFn: async (input: { id: string; fixada: boolean }) => {
      const { error } = await supabase
        .from("mae_observacoes")
        .update({ fixada: input.fixada })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao fixar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Sem usuário");
      const { error } = await supabase
        .from("mae_observacoes")
        .update({
          excluida_em: new Date().toISOString(),
          excluida_por: user.id,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anotação removida");
      queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao remover"),
  });

  return { ...query, create, update, togglePin, remove };
}
