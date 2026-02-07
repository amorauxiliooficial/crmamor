import { useQuery, useQueryClient } from "@tanstack/react-query";
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

// Fetch metas from database
async function fetchMetasConfig(): Promise<MetaConfig[]> {
  const { data, error } = await supabase
    .from("metas_config")
    .select("*")
    .eq("ativo", true)
    .order("created_at");

  if (error) throw error;
  return (data || []) as MetaConfig[];
}

export function useMetas() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["metas_config"],
    queryFn: fetchMetasConfig,
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });

  const updateMeta = async (id: string, updates: Partial<MetaConfig>) => {
    const { error } = await supabase
      .from("metas_config")
      .update(updates)
      .eq("id", id);
    
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["metas_config"] });
      queryClient.invalidateQueries({ queryKey: ["metas_progress"] });
    }
    return { error };
  };

  const createMeta = async (meta: Omit<MetaConfig, "id" | "ativo">) => {
    const { error } = await supabase
      .from("metas_config")
      .insert(meta);
    
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["metas_config"] });
      queryClient.invalidateQueries({ queryKey: ["metas_progress"] });
    }
    return { error };
  };

  const deleteMeta = async (id: string) => {
    const { error } = await supabase
      .from("metas_config")
      .delete()
      .eq("id", id);
    
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["metas_config"] });
      queryClient.invalidateQueries({ queryKey: ["metas_progress"] });
    }
    return { error };
  };

  return { 
    metas: query.data || [], 
    loading: query.isLoading, 
    refetch: () => queryClient.invalidateQueries({ queryKey: ["metas_config"] }), 
    updateMeta, 
    createMeta, 
    deleteMeta 
  };
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

// Optimized: Fetch all counts for all metas in parallel
async function fetchAllCounts(
  metas: MetaConfig[],
  userId: string,
  now: Date
): Promise<MetaProgress[]> {
  if (metas.length === 0) return [];

  // Group metas by period to optimize date calculations
  const progressPromises = metas.map(async (meta) => {
    const { startDate, endDate, prevStartDate, prevEndDate } = getPeriodDates(meta.periodo, now);

    // Run current and previous period counts in parallel
    const [realizado, realizadoAnterior] = await Promise.all([
      countForPeriod(meta.tipo_meta, userId, startDate, endDate),
      countForPeriod(meta.tipo_meta, userId, prevStartDate, prevEndDate),
    ]);

    const percentual = meta.valor_meta > 0 ? (realizado / meta.valor_meta) * 100 : 0;
    
    let variacao = 0;
    if (realizadoAnterior > 0) {
      variacao = ((realizado - realizadoAnterior) / realizadoAnterior) * 100;
    } else if (realizado > 0) {
      variacao = 100;
    }

    return {
      meta,
      realizado,
      realizadoAnterior,
      percentual,
      variacao,
    };
  });

  // Execute ALL meta progress calculations in parallel
  return Promise.all(progressPromises);
}

// Helper to count records for a period (optimized with count only)
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

// Fetch progress data - optimized with parallel execution
async function fetchMetasProgress(userId: string): Promise<MetaProgress[]> {
  const metas = await fetchMetasConfig();
  
  if (metas.length === 0) return [];

  const now = new Date();
  
  // Execute all counts in parallel instead of sequential
  return fetchAllCounts(metas, userId, now);
}

// Hook to calculate progress for a specific user
export function useMetasProgress(userId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["metas_progress", userId],
    queryFn: () => fetchMetasProgress(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutos - dados ficam frescos
    gcTime: 1000 * 60 * 10, // 10 minutos no cache
    refetchOnWindowFocus: false, // Não atualiza ao focar a janela
    refetchOnMount: false, // Não atualiza ao montar (usa cache)
    refetchInterval: false, // Sem polling automático
  });

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["metas_progress", userId] });
  };

  return { 
    progress: query.data || [], 
    loading: query.isLoading, 
    refetch,
    metas: query.data?.map(p => p.meta) || []
  };
}
