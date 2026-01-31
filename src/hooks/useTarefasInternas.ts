import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TarefaInterna, TaskStatus, TaskPriority, TaskCategory } from "@/types/tarefaInterna";

export function useTarefasInternas() {
  const [tarefas, setTarefas] = useState<TarefaInterna[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTarefas = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tarefas_internas")
      .select("*")
      .order("ordem", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tarefas:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar tarefas",
        description: error.message,
      });
    } else {
      setTarefas(data as TarefaInterna[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchTarefas();
  }, [fetchTarefas]);

  const createTarefa = async (tarefa: {
    titulo: string;
    descricao?: string;
    status?: TaskStatus;
    prioridade?: TaskPriority;
    categoria?: TaskCategory;
    responsavel_id?: string;
    prazo?: string;
  }) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return null;

    const { data, error } = await supabase
      .from("tarefas_internas")
      .insert({
        titulo: tarefa.titulo,
        descricao: tarefa.descricao || null,
        status: tarefa.status || "backlog",
        prioridade: tarefa.prioridade || "media",
        categoria: tarefa.categoria || "melhoria",
        responsavel_id: tarefa.responsavel_id || null,
        prazo: tarefa.prazo || null,
        created_by: user.user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar tarefa",
        description: error.message,
      });
      return null;
    }

    setTarefas((prev) => [data as TarefaInterna, ...prev]);
    toast({
      title: "Tarefa criada",
      description: `"${tarefa.titulo}" foi adicionada ao backlog.`,
    });
    return data;
  };

  const updateTarefa = async (id: string, updates: Partial<TarefaInterna>) => {
    const { error } = await supabase
      .from("tarefas_internas")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar tarefa",
        description: error.message,
      });
      return false;
    }

    setTarefas((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    return true;
  };

  const updateStatus = async (id: string, newStatus: TaskStatus) => {
    // Optimistic update
    setTarefas((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );

    const { error } = await supabase
      .from("tarefas_internas")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: error.message,
      });
      fetchTarefas(); // Revert on error
      return false;
    }

    toast({
      title: "Status atualizado",
      description: `Tarefa movida para ${newStatus}.`,
    });
    return true;
  };

  const deleteTarefa = async (id: string) => {
    const { error } = await supabase
      .from("tarefas_internas")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir tarefa",
        description: error.message,
      });
      return false;
    }

    setTarefas((prev) => prev.filter((t) => t.id !== id));
    toast({
      title: "Tarefa excluída",
      description: "A tarefa foi removida.",
    });
    return true;
  };

  return {
    tarefas,
    loading,
    fetchTarefas,
    createTarefa,
    updateTarefa,
    updateStatus,
    deleteTarefa,
  };
}
