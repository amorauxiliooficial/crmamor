import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Atividade, StatusFollowUp } from "@/types/atividade";
import { startOfDay, endOfDay, isToday, isPast, isFuture, parseISO } from "date-fns";

export interface PendingFollowUp extends Atividade {
  mae_nome: string;
  mae_cpf: string;
  mae_status: string;
  mae_telefone?: string | null;
}

export function useCrmAtividades() {
  const [pendingFollowUps, setPendingFollowUps] = useState<PendingFollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingFollowUps = useCallback(async () => {
    setLoading(true);

    // Fetch activities with scheduled follow-ups that aren't completed
    const { data, error } = await supabase
      .from("atividades_mae")
      .select(`
        *,
        mae_processo!inner(
          id,
          nome_mae,
          cpf,
          telefone,
          status_processo
        )
      `)
      .eq("status_followup", "agendado")
      .eq("concluido", false)
      .not("data_proxima_acao", "is", null)
      .order("data_proxima_acao", { ascending: true });

    if (error) {
      console.error("Erro ao carregar follow-ups:", error);
    } else if (data) {
      const mapped = data.map((item: any) => ({
        ...item,
        mae_nome: item.mae_processo.nome_mae,
        mae_cpf: item.mae_processo.cpf,
        mae_status: item.mae_processo.status_processo,
        mae_telefone: item.mae_processo.telefone,
      }));
      setPendingFollowUps(mapped);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPendingFollowUps();
  }, [fetchPendingFollowUps]);

  // Categorize follow-ups
  const categorized = useMemo(() => {
    const overdue: PendingFollowUp[] = [];
    const today: PendingFollowUp[] = [];
    const upcoming: PendingFollowUp[] = [];

    pendingFollowUps.forEach((followUp) => {
      if (!followUp.data_proxima_acao) return;
      
      const date = parseISO(followUp.data_proxima_acao);
      
      if (isToday(date)) {
        today.push(followUp);
      } else if (isPast(date)) {
        overdue.push(followUp);
      } else {
        upcoming.push(followUp);
      }
    });

    return { overdue, today, upcoming };
  }, [pendingFollowUps]);

  // Mark follow-up as completed
  const completeFollowUp = async (atividadeId: string) => {
    const { error } = await supabase
      .from("atividades_mae")
      .update({
        status_followup: "concluido" as StatusFollowUp,
        concluido: true,
        concluido_em: new Date().toISOString(),
      })
      .eq("id", atividadeId);

    if (!error) {
      fetchPendingFollowUps();
    }

    return { error };
  };

  // Cancel follow-up
  const cancelFollowUp = async (atividadeId: string) => {
    const { error } = await supabase
      .from("atividades_mae")
      .update({
        status_followup: "cancelado" as StatusFollowUp,
      })
      .eq("id", atividadeId);

    if (!error) {
      fetchPendingFollowUps();
    }

    return { error };
  };

  // Reschedule follow-up
  const rescheduleFollowUp = async (atividadeId: string, newDate: Date) => {
    const { error } = await supabase
      .from("atividades_mae")
      .update({
        data_proxima_acao: newDate.toISOString(),
      })
      .eq("id", atividadeId);

    if (!error) {
      fetchPendingFollowUps();
    }

    return { error };
  };

  return {
    pendingFollowUps,
    loading,
    categorized,
    refetch: fetchPendingFollowUps,
    completeFollowUp,
    cancelFollowUp,
    rescheduleFollowUp,
  };
}

// Hook for calendar view
export function useFollowUpsByDate(selectedDate: Date) {
  const [followUps, setFollowUps] = useState<PendingFollowUp[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchByDate = async () => {
      setLoading(true);

      const start = startOfDay(selectedDate).toISOString();
      const end = endOfDay(selectedDate).toISOString();

      const { data, error } = await supabase
        .from("atividades_mae")
        .select(`
          *,
          mae_processo!inner(
            id,
            nome_mae,
            cpf,
            telefone,
            status_processo
          )
        `)
        .eq("status_followup", "agendado")
        .eq("concluido", false)
        .gte("data_proxima_acao", start)
        .lte("data_proxima_acao", end)
        .order("data_proxima_acao", { ascending: true });

      if (error) {
        console.error("Erro ao carregar follow-ups por data:", error);
      } else if (data) {
        const mapped = data.map((item: any) => ({
          ...item,
          mae_nome: item.mae_processo.nome_mae,
          mae_cpf: item.mae_processo.cpf,
          mae_status: item.mae_processo.status_processo,
          mae_telefone: item.mae_processo.telefone,
        }));
        setFollowUps(mapped);
      }

      setLoading(false);
    };

    fetchByDate();
  }, [selectedDate]);

  return { followUps, loading };
}

// Hook to get follow-up counts for calendar
export function useFollowUpCounts(year: number, month: number) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);

      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      const { data, error } = await supabase
        .from("atividades_mae")
        .select("data_proxima_acao")
        .eq("status_followup", "agendado")
        .eq("concluido", false)
        .gte("data_proxima_acao", startDate.toISOString())
        .lte("data_proxima_acao", endDate.toISOString());

      if (!error && data) {
        const countMap: Record<string, number> = {};
        data.forEach((item) => {
          if (item.data_proxima_acao) {
            const dateKey = item.data_proxima_acao.split("T")[0];
            countMap[dateKey] = (countMap[dateKey] || 0) + 1;
          }
        });
        setCounts(countMap);
      }

      setLoading(false);
    };

    fetchCounts();
  }, [year, month]);

  return { counts, loading };
}
