import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";

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
  percentual: number;
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
      fetchMetas();
    }
    return { error };
  };

  const createMeta = async (meta: Omit<MetaConfig, "id" | "ativo">) => {
    const { error } = await supabase
      .from("metas_config")
      .insert(meta);
    
    if (!error) {
      fetchMetas();
    }
    return { error };
  };

  const deleteMeta = async (id: string) => {
    const { error } = await supabase
      .from("metas_config")
      .delete()
      .eq("id", id);
    
    if (!error) {
      fetchMetas();
    }
    return { error };
  };

  return { metas, loading, refetch: fetchMetas, updateMeta, createMeta, deleteMeta };
}

// Hook to calculate progress for a specific user
export function useMetasProgress(userId: string | null) {
  const { metas, loading: metasLoading } = useMetas();
  const [progress, setProgress] = useState<MetaProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || metasLoading || metas.length === 0) {
      setLoading(false);
      return;
    }

    const calculateProgress = async () => {
      setLoading(true);
      const now = new Date();
      const progressData: MetaProgress[] = [];

      for (const meta of metas) {
        let startDate: Date;
        let endDate: Date;

        switch (meta.periodo) {
          case "diario":
            startDate = startOfDay(now);
            endDate = endOfDay(now);
            break;
          case "semanal":
            startDate = startOfWeek(now, { weekStartsOn: 1 });
            endDate = endOfWeek(now, { weekStartsOn: 1 });
            break;
          case "mensal":
          default:
            startDate = startOfMonth(now);
            endDate = endOfMonth(now);
            break;
        }

        let realizado = 0;

        switch (meta.tipo_meta) {
          case "cadastros": {
            const { count } = await supabase
              .from("mae_processo")
              .select("*", { count: "exact", head: true })
              .eq("user_id", userId)
              .gte("created_at", startDate.toISOString())
              .lte("created_at", endDate.toISOString());
            realizado = count || 0;
            break;
          }
          case "contratos": {
            const { count } = await supabase
              .from("mae_processo")
              .select("*", { count: "exact", head: true })
              .eq("user_id", userId)
              .eq("contrato_assinado", true)
              .gte("data_ultima_atualizacao", startDate.toISOString())
              .lte("data_ultima_atualizacao", endDate.toISOString());
            realizado = count || 0;
            break;
          }
          case "aprovados": {
            const { count } = await supabase
              .from("mae_processo")
              .select("*", { count: "exact", head: true })
              .eq("user_id", userId)
              .eq("status_processo", "Aprovada")
              .gte("data_ultima_atualizacao", startDate.toISOString())
              .lte("data_ultima_atualizacao", endDate.toISOString());
            realizado = count || 0;
            break;
          }
          case "atividades":
          case "follow_ups": {
            const { count } = await supabase
              .from("atividades_mae")
              .select("*", { count: "exact", head: true })
              .eq("user_id", userId)
              .gte("data_atividade", startDate.toISOString())
              .lte("data_atividade", endDate.toISOString());
            realizado = count || 0;
            break;
          }
        }

        const percentual = meta.valor_meta > 0 ? Math.min((realizado / meta.valor_meta) * 100, 100) : 0;

        progressData.push({
          meta,
          realizado,
          percentual,
        });
      }

      setProgress(progressData);
      setLoading(false);
    };

    calculateProgress();
  }, [userId, metas, metasLoading]);

  return { progress, loading: loading || metasLoading };
}
