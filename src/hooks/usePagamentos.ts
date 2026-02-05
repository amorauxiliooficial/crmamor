import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface PagamentoComMae {
  id: string;
  mae_id: string;
  user_id: string;
  tipo_pagamento: string;
  total_parcelas: number;
  valor_total: number | null;
  percentual_comissao: number | null;
  mae_nome: string;
  mae_cpf: string;
  mae_cep: string | null;
  mae_uf: string | null;
  parcelas: {
    id: string;
    numero_parcela: number;
    valor: number | null;
    valor_comissao: number | null;
    data_pagamento: string | null;
    status: string;
    observacoes: string | null;
  }[];
  // Calculated commission fields
  comissao_total: number;
  comissao_recebida: number;
  comissao_pendente: number;
}

async function fetchPagamentos(): Promise<PagamentoComMae[]> {
  // Fetch all pagamentos with related mae and parcelas in fewer queries
  const { data: pagamentosData, error: pagError } = await supabase
    .from("pagamentos_mae")
    .select("*")
    .order("created_at", { ascending: false });

  if (pagError) {
    throw new Error(pagError.message);
  }

  if (!pagamentosData || pagamentosData.length === 0) {
    return [];
  }

  // Get unique mae_ids
  const maeIds = [...new Set(pagamentosData.map((p) => p.mae_id))];
  const pagamentoIds = pagamentosData.map((p) => p.id);

  // Fetch all maes in one query
  const { data: maes } = await supabase
    .from("mae_processo")
    .select("id, nome_mae, cpf, cep, uf")
    .in("id", maeIds);

  // Fetch all parcelas in one query
  const { data: todasParcelas } = await supabase
    .from("parcelas_pagamento")
    .select("*")
    .in("pagamento_id", pagamentoIds)
    .order("numero_parcela", { ascending: true });

  // Create lookup maps
  const maeMap = new Map(maes?.map((m) => [m.id, m]) || []);
  const parcelasMap = new Map<string, typeof todasParcelas>();
  
  todasParcelas?.forEach((p) => {
    if (!parcelasMap.has(p.pagamento_id)) {
      parcelasMap.set(p.pagamento_id, []);
    }
    parcelasMap.get(p.pagamento_id)!.push(p);
  });

  // Build result
  return pagamentosData.map((pag) => {
    const mae = maeMap.get(pag.mae_id);
    const parcelas = parcelasMap.get(pag.id) || [];

    // Calculate commission totals
    let comissao_recebida = 0;
    let comissao_pendente = 0;

    parcelas.forEach((p) => {
      const comissao = p.valor_comissao || 0;
      if (p.status === "pago") {
        comissao_recebida += comissao;
      } else {
        comissao_pendente += comissao;
      }
    });

    const comissao_total = comissao_recebida + comissao_pendente;

    return {
      id: pag.id,
      mae_id: pag.mae_id,
      user_id: pag.user_id,
      tipo_pagamento: pag.tipo_pagamento,
      total_parcelas: pag.total_parcelas || 0,
      valor_total: pag.valor_total,
      percentual_comissao: pag.percentual_comissao,
      mae_nome: mae?.nome_mae || "N/A",
      mae_cpf: mae?.cpf || "",
      mae_cep: mae?.cep || null,
      mae_uf: mae?.uf || null,
      parcelas: parcelas.map((p) => ({
        id: p.id,
        numero_parcela: p.numero_parcela,
        valor: p.valor,
        valor_comissao: p.valor_comissao,
        data_pagamento: p.data_pagamento,
        status: p.status,
        observacoes: p.observacoes,
      })),
      comissao_total,
      comissao_recebida,
      comissao_pendente,
    };
  });
}

export function usePagamentos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["pagamentos"],
    queryFn: fetchPagamentos,
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    gcTime: 1000 * 60 * 10, // 10 minutes garbage collection
  });

  // Real-time subscription for pagamentos_mae and parcelas_pagamento
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("pagamentos-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pagamentos_mae",
        },
        () => {
          // Invalidate and refetch when pagamentos change
          queryClient.invalidateQueries({ queryKey: ["pagamentos"] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "parcelas_pagamento",
        },
        () => {
          // Invalidate and refetch when parcelas change
          queryClient.invalidateQueries({ queryKey: ["pagamentos"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["pagamentos"] });
  };

  return {
    pagamentos: query.data || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch,
  };
}
