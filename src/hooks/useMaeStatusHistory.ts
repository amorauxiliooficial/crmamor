import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StatusHistoryRow {
  mae_id: string;
  status_anterior: string | null;
  status_novo: string;
  changed_at: string;
}

export interface MaeFaseInfo {
  mae_id: string;
  diasNaFaseAtual: number;
  diasNoCRM: number;
  changedAtFase: string;
}

const DAY = 1000 * 60 * 60 * 24;

/**
 * Para um conjunto de mães + a fase atual, retorna dias na fase e dias totais no CRM.
 */
export function useMaesFaseInfo(maeIds: string[], statusAtual: string | null) {
  return useQuery({
    queryKey: ["mae_status_history", "fase-info", statusAtual, [...maeIds].sort()],
    enabled: maeIds.length > 0 && !!statusAtual,
    staleTime: 30_000,
    queryFn: async (): Promise<Record<string, MaeFaseInfo>> => {
      const { data, error } = await supabase
        .from("mae_status_history")
        .select("mae_id, status_anterior, status_novo, changed_at")
        .in("mae_id", maeIds)
        .order("changed_at", { ascending: true });
      if (error) throw error;

      const byMae = new Map<string, StatusHistoryRow[]>();
      for (const row of (data || []) as StatusHistoryRow[]) {
        if (!byMae.has(row.mae_id)) byMae.set(row.mae_id, []);
        byMae.get(row.mae_id)!.push(row);
      }

      const now = Date.now();
      const result: Record<string, MaeFaseInfo> = {};

      for (const id of maeIds) {
        const rows = byMae.get(id) ?? [];
        if (rows.length === 0) {
          result[id] = { mae_id: id, diasNaFaseAtual: 0, diasNoCRM: 0, changedAtFase: new Date().toISOString() };
          continue;
        }

        // último registro com status_novo = statusAtual define entrada na fase atual
        let entrada = rows[0].changed_at;
        for (let i = rows.length - 1; i >= 0; i--) {
          if (rows[i].status_novo === statusAtual) {
            entrada = rows[i].changed_at;
            break;
          }
        }

        const primeiro = rows[0].changed_at;
        result[id] = {
          mae_id: id,
          changedAtFase: entrada,
          diasNaFaseAtual: Math.max(0, Math.floor((now - new Date(entrada).getTime()) / DAY)),
          diasNoCRM: Math.max(0, Math.floor((now - new Date(primeiro).getTime()) / DAY)),
        };
      }
      return result;
    },
  });
}

/**
 * Tempo médio (dias) que mães já passaram numa determinada fase (histórico completo).
 */
export function useTempoMedioPorFase() {
  return useQuery({
    queryKey: ["mae_status_history", "tempo-medio-fase"],
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("mae_status_history")
        .select("mae_id, status_novo, changed_at")
        .order("mae_id", { ascending: true })
        .order("changed_at", { ascending: true });
      if (error) throw error;

      const byMae = new Map<string, StatusHistoryRow[]>();
      for (const row of (data || []) as StatusHistoryRow[]) {
        if (!byMae.has(row.mae_id)) byMae.set(row.mae_id, []);
        byMae.get(row.mae_id)!.push(row);
      }

      const acc: Record<string, { total: number; count: number }> = {};

      byMae.forEach((rows) => {
        for (let i = 0; i < rows.length - 1; i++) {
          const fase = rows[i].status_novo;
          const ms = new Date(rows[i + 1].changed_at).getTime() - new Date(rows[i].changed_at).getTime();
          const dias = Math.max(0, ms / DAY);
          if (!acc[fase]) acc[fase] = { total: 0, count: 0 };
          acc[fase].total += dias;
          acc[fase].count += 1;
        }
      });

      const result: Record<string, number> = {};
      Object.entries(acc).forEach(([fase, v]) => {
        result[fase] = v.count > 0 ? v.total / v.count : 0;
      });
      return result;
    },
  });
}
