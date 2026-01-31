import { useState, useEffect, useCallback, useRef } from "react";
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
  variacao: number;
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
  switch (periodo) {
    case "diario":
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
        prevStartDate: startOfDay(subDays(now, 1)),
        prevEndDate: endOfDay(subDays(now, 1)),
      };
    case "semanal":
      return {
        startDate: startOfWeek(now, { weekStartsOn: 1 }),
        endDate: endOfWeek(now, { weekStartsOn: 1 }),
        prevStartDate: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }),
        prevEndDate: endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }),
      };
    case "mensal":
    default:
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
        prevStartDate: startOfMonth(subMonths(now, 1)),
        prevEndDate: endOfMonth(subMonths(now, 1)),
      };
  }
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
  const [metas, setMetas] = useState<MetaConfig[]>([]);
  const [progress, setProgress] = useState<MetaProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  // Fetch metas directly in this hook to avoid hook nesting issues
  const fetchMetas = useCallback(async () => {
    const { data, error } = await supabase
      .from("metas_config")
      .select("*")
      .eq("ativo", true)
      .order("created_at");

    if (!error && data && isMountedRef.current) {
      setMetas(data as MetaConfig[]);
    }
    return data as MetaConfig[] | null;
  }, []);

  // Calculate progress based on metas and userId
  const calculateProgress = useCallback(async (metasList: MetaConfig[], uid: string) => {
    if (!uid || metasList.length === 0) {
      if (isMountedRef.current) {
        setProgress([]);
        setLoading(false);
      }
      return;
    }

    const now = new Date();
    const progressData: MetaProgress[] = [];

    for (const meta of metasList) {
      const { startDate, endDate, prevStartDate, prevEndDate } = getPeriodDates(meta.periodo, now);

      const realizado = await countForPeriod(meta.tipo_meta, uid, startDate, endDate);
      const realizadoAnterior = await countForPeriod(meta.tipo_meta, uid, prevStartDate, prevEndDate);

      const percentual = meta.valor_meta > 0 ? (realizado / meta.valor_meta) * 100 : 0;
      
      let variacao = 0;
      if (realizadoAnterior > 0) {
        variacao = ((realizado - realizadoAnterior) / realizadoAnterior) * 100;
      } else if (realizado > 0) {
        variacao = 100;
      }

      progressData.push({
        meta,
        realizado,
        realizadoAnterior,
        percentual,
        variacao,
      });
    }

    if (isMountedRef.current) {
      setProgress(progressData);
      setLoading(false);
    }
  }, []);

  // Main effect to load data
  useEffect(() => {
    isMountedRef.current = true;
    
    const loadData = async () => {
      if (!userId) {
        setProgress([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const metasList = await fetchMetas();
      
      if (metasList && isMountedRef.current) {
        await calculateProgress(metasList, userId);
      } else if (isMountedRef.current) {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      isMountedRef.current = false;
    };
  }, [userId, fetchMetas, calculateProgress]);

  const refetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const metasList = await fetchMetas();
    if (metasList) {
      await calculateProgress(metasList, userId);
    }
  }, [userId, fetchMetas, calculateProgress]);

  return { progress, loading, refetch, metas };
}
