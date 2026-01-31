import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay,
  subDays, subWeeks, subMonths
} from "date-fns";

export interface MetaConfig {
  id: string;
  nome: string;
  descricao: string | null;
  tipo_meta: "cadastros" | "contratos" | "aprovados" | "atividades" | "follow_ups";
  valor_meta: number;
  periodo: "diario" | "semanal" | "mensal";
  ativo: boolean;
}

export interface MetaProgress {
  meta: MetaConfig;
  realizado: number;
  realizadoAnterior: number;
  percentual: number;
  variacao: number; // +/- percentage compared to previous period
}

export function useMetas() {
  const [metas, setMetas] = useState<MetaConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetas = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("metas_config")
      .select("*")
      .eq("ativo", true)
      .order("created_at");

    if (!error && data) {
      setMetas(data as MetaConfig[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMetas();
  }, [fetchMetas]);

  const updateMeta = async (id: string, updates: Partial<MetaConfig>) => {
    const { error } = await supabase
      .from("metas_config")
      .update(updates)
      .eq("id", id);
    
    if (!error) {
      await fetchMetas();
    }
    return { error };
  };

  const createMeta = async (meta: Omit<MetaConfig, "id" | "ativo">) => {
    const { error } = await supabase
      .from("metas_config")
      .insert(meta);
    
    if (!error) {
      await fetchMetas();
    }
    return { error };
  };

  const deleteMeta = async (id: string) => {
    const { error } = await supabase
      .from("metas_config")
      .delete()
      .eq("id", id);
    
    if (!error) {
      await fetchMetas();
    }
    return { error };
  };

  return { metas, loading, refetch: fetchMetas, updateMeta, createMeta, deleteMeta };
}

// Helper to get period dates
function getPeriodDates(periodo: string, now: Date) {
  let startDate: Date;
  let endDate: Date;
  let prevStartDate: Date;
  let prevEndDate: Date;

  switch (periodo) {
    case "diario":
      startDate = startOfDay(now);
      endDate = endOfDay(now);
      prevStartDate = startOfDay(subDays(now, 1));
      prevEndDate = endOfDay(subDays(now, 1));
      break;
    case "semanal":
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
      prevStartDate = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      prevEndDate = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      break;
    case "mensal":
    default:
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      prevStartDate = startOfMonth(subMonths(now, 1));
      prevEndDate = endOfMonth(subMonths(now, 1));
      break;
  }

  return { startDate, endDate, prevStartDate, prevEndDate };
}

// Helper to count records for a period
async function countForPeriod(
  tipoMeta: string,
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  switch (tipoMeta) {
    case "cadastros": {
      const { count } = await supabase
        .from("mae_processo")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());
      return count || 0;
    }
    case "contratos": {
      const { count } = await supabase
        .from("mae_processo")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("contrato_assinado", true)
        .gte("data_ultima_atualizacao", startDate.toISOString())
        .lte("data_ultima_atualizacao", endDate.toISOString());
      return count || 0;
    }
    case "aprovados": {
      const { count } = await supabase
        .from("mae_processo")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status_processo", "Aprovada")
        .gte("data_ultima_atualizacao", startDate.toISOString())
        .lte("data_ultima_atualizacao", endDate.toISOString());
      return count || 0;
    }
    case "atividades":
    case "follow_ups": {
      const { count } = await supabase
        .from("atividades_mae")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("data_atividade", startDate.toISOString())
        .lte("data_atividade", endDate.toISOString());
      return count || 0;
    }
    default:
      return 0;
  }
}

// Hook to calculate progress for a specific user
export function useMetasProgress(userId: string | null) {
  const { metas, loading: metasLoading, refetch } = useMetas();
  const [progress, setProgress] = useState<MetaProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const calculateProgress = useCallback(async () => {
    if (!userId || metas.length === 0) {
      setProgress([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const now = new Date();
    const progressData: MetaProgress[] = [];

    for (const meta of metas) {
      const { startDate, endDate, prevStartDate, prevEndDate } = getPeriodDates(meta.periodo, now);

      const realizado = await countForPeriod(meta.tipo_meta, userId, startDate, endDate);
      const realizadoAnterior = await countForPeriod(meta.tipo_meta, userId, prevStartDate, prevEndDate);

      const percentual = meta.valor_meta > 0 ? (realizado / meta.valor_meta) * 100 : 0;
      
      // Calculate variation: if previous was 0, show as new growth
      let variacao = 0;
      if (realizadoAnterior > 0) {
        variacao = ((realizado - realizadoAnterior) / realizadoAnterior) * 100;
      } else if (realizado > 0) {
        variacao = 100; // New growth from zero
      }

      progressData.push({
        meta,
        realizado,
        realizadoAnterior,
        percentual,
        variacao,
      });
    }

    setProgress(progressData);
    setLoading(false);
  }, [userId, metas]);

  useEffect(() => {
    calculateProgress();
  }, [calculateProgress]);

  return { 
    progress, 
    loading: loading || metasLoading,
    refetch: async () => {
      await refetch();
      await calculateProgress();
    }
  };
}
