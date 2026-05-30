import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MetaFase {
  status_processo: string;
  meta_valor: number;
  meta_quantidade: number;
  ticket_medio: number | null;
  taxa_pagamento: number | null;
}

export interface ForecastPremissas {
  id: string;
  ticket_medio_padrao: number;
  taxa_pagamento_padrao: number;
}

export function useForecastMetas() {
  const queryClient = useQueryClient();

  const metasQuery = useQuery({
    queryKey: ["forecast_metas_fase"],
    queryFn: async (): Promise<MetaFase[]> => {
      const { data, error } = await supabase
        .from("forecast_metas_fase")
        .select("status_processo, meta_valor, meta_quantidade, ticket_medio");
      if (error) throw error;
      return (data || []).map((r) => ({
        status_processo: r.status_processo,
        meta_valor: Number(r.meta_valor) || 0,
        meta_quantidade: Number(r.meta_quantidade) || 0,
        ticket_medio: r.ticket_medio !== null ? Number(r.ticket_medio) : null,
      }));
    },
    staleTime: 60_000,
  });

  const premissasQuery = useQuery({
    queryKey: ["forecast_premissas"],
    queryFn: async (): Promise<ForecastPremissas | null> => {
      const { data, error } = await supabase
        .from("forecast_premissas")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        ticket_medio_padrao: Number(data.ticket_medio_padrao) || 1800,
        taxa_pagamento_padrao: Number(data.taxa_pagamento_padrao) || 0.75,
      };
    },
    staleTime: 60_000,
  });

  // Realtime: invalida ao mudar
  useEffect(() => {
    const channel = supabase
      .channel("forecast-config")
      .on("postgres_changes", { event: "*", schema: "public", table: "forecast_metas_fase" }, () => {
        queryClient.invalidateQueries({ queryKey: ["forecast_metas_fase"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "forecast_premissas" }, () => {
        queryClient.invalidateQueries({ queryKey: ["forecast_premissas"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const saveMetas = useMutation({
    mutationFn: async (metas: MetaFase[]) => {
      const { error } = await supabase
        .from("forecast_metas_fase")
        .upsert(
          metas.map((m) => ({
            status_processo: m.status_processo,
            meta_valor: m.meta_valor,
            meta_quantidade: m.meta_quantidade,
            ticket_medio: m.ticket_medio,
          })),
          { onConflict: "status_processo" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forecast_metas_fase"] });
      toast.success("Metas atualizadas");
    },
    onError: (e: Error) => toast.error(`Erro ao salvar metas: ${e.message}`),
  });

  const savePremissas = useMutation({
    mutationFn: async (p: { ticket_medio_padrao: number; taxa_pagamento_padrao: number; id?: string }) => {
      if (p.id) {
        const { error } = await supabase
          .from("forecast_premissas")
          .update({
            ticket_medio_padrao: p.ticket_medio_padrao,
            taxa_pagamento_padrao: p.taxa_pagamento_padrao,
          })
          .eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("forecast_premissas")
          .insert({
            ticket_medio_padrao: p.ticket_medio_padrao,
            taxa_pagamento_padrao: p.taxa_pagamento_padrao,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forecast_premissas"] });
      toast.success("Premissas atualizadas");
    },
    onError: (e: Error) => toast.error(`Erro ao salvar premissas: ${e.message}`),
  });

  return {
    metas: metasQuery.data ?? [],
    premissas: premissasQuery.data ?? null,
    loading: metasQuery.isLoading || premissasQuery.isLoading,
    saveMetas,
    savePremissas,
  };
}
