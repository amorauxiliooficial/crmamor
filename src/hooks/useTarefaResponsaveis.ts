import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TarefaResponsavel {
  tarefa_id: string;
  user_id: string;
}

export function useTarefaResponsaveis() {
  const [responsaveis, setResponsaveis] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchResponsaveis = useCallback(async () => {
    const { data, error } = await supabase
      .from("tarefa_responsaveis")
      .select("tarefa_id, user_id");

    if (error) {
      console.error("Error fetching tarefa responsaveis:", error);
      return;
    }

    // Group by tarefa_id
    const grouped: Record<string, string[]> = {};
    data?.forEach((r: TarefaResponsavel) => {
      if (!grouped[r.tarefa_id]) {
        grouped[r.tarefa_id] = [];
      }
      grouped[r.tarefa_id].push(r.user_id);
    });

    setResponsaveis(grouped);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchResponsaveis();
  }, [fetchResponsaveis]);

  const updateResponsaveis = async (tarefaId: string, userIds: string[]) => {
    // Delete existing
    const { error: deleteError } = await supabase
      .from("tarefa_responsaveis")
      .delete()
      .eq("tarefa_id", tarefaId);

    if (deleteError) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar responsáveis",
        description: deleteError.message,
      });
      return false;
    }

    // Insert new ones
    if (userIds.length > 0) {
      const { error: insertError } = await supabase
        .from("tarefa_responsaveis")
        .insert(
          userIds.map((userId) => ({
            tarefa_id: tarefaId,
            user_id: userId,
          }))
        );

      if (insertError) {
        toast({
          variant: "destructive",
          title: "Erro ao atualizar responsáveis",
          description: insertError.message,
        });
        return false;
      }
    }

    // Update local state
    setResponsaveis((prev) => ({
      ...prev,
      [tarefaId]: userIds,
    }));

    return true;
  };

  const getResponsaveisForTarefa = (tarefaId: string): string[] => {
    return responsaveis[tarefaId] || [];
  };

  return {
    responsaveis,
    loading,
    fetchResponsaveis,
    updateResponsaveis,
    getResponsaveisForTarefa,
  };
}
