import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ComissaoMae {
  id: string;
  nome_mae: string;
  cpf: string;
  status_processo: string;
  percentual_comissao: number | null;
  user_id: string;
  usuario_nome: string | null;
  usuario_email: string | null;
  pagamento_id: string | null;
  valor_total_pagamento: number;
  valor_total_pago: number;
  valor_total_pendente: number;
  comissao_calculada: number;
  comissao_recebida: number;
  comissao_pendente: number;
  parcelas: {
    id: string;
    numero_parcela: number;
    valor: number | null;
    status: string;
    data_pagamento: string | null;
    valor_comissao: number | null;
  }[];
}

export interface ComissaoResumoUsuario {
  user_id: string;
  usuario_nome: string | null;
  usuario_email: string | null;
  total_maes: number;
  maes_aprovadas: number;
  valor_total_pagamentos: number;
  comissao_total: number;
  comissao_recebida: number;
  comissao_pendente: number;
}

async function fetchComissoes(): Promise<{
  maesComComissao: ComissaoMae[];
  resumoPorUsuario: ComissaoResumoUsuario[];
}> {
  // Fetch all mae_processo with status Aprovada
  const { data: maesData, error: maesError } = await supabase
    .from("mae_processo")
    .select("id, nome_mae, cpf, status_processo, percentual_comissao, user_id")
    .eq("status_processo", "Aprovada")
    .order("nome_mae", { ascending: true });

  if (maesError) throw new Error(maesError.message);

  if (!maesData || maesData.length === 0) {
    return { maesComComissao: [], resumoPorUsuario: [] };
  }

  // Get unique user_ids
  const userIds = [...new Set(maesData.map((m) => m.user_id))];
  const maeIds = maesData.map((m) => m.id);

  // Fetch profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  // Fetch pagamentos_mae
  const { data: pagamentosData } = await supabase
    .from("pagamentos_mae")
    .select("id, mae_id, valor_total, percentual_comissao")
    .in("mae_id", maeIds);

  const pagamentosByMaeId = new Map<string, typeof pagamentosData>();
  const pagamentoIds: string[] = [];
  pagamentosData?.forEach((p) => {
    if (!pagamentosByMaeId.has(p.mae_id)) {
      pagamentosByMaeId.set(p.mae_id, []);
    }
    pagamentosByMaeId.get(p.mae_id)!.push(p);
    pagamentoIds.push(p.id);
  });

  // Fetch all parcelas
  const { data: parcelasData } = pagamentoIds.length > 0
    ? await supabase
        .from("parcelas_pagamento")
        .select("*")
        .in("pagamento_id", pagamentoIds)
        .order("numero_parcela", { ascending: true })
    : { data: [] };

  const parcelasByPagamentoId = new Map<string, typeof parcelasData>();
  parcelasData?.forEach((p) => {
    if (!parcelasByPagamentoId.has(p.pagamento_id)) {
      parcelasByPagamentoId.set(p.pagamento_id, []);
    }
    parcelasByPagamentoId.get(p.pagamento_id)!.push(p);
  });

  // Build result
  const maesComComissao: ComissaoMae[] = maesData.map((mae) => {
    const profile = profileMap.get(mae.user_id);
    const pagamentos = pagamentosByMaeId.get(mae.id) || [];
    const pagamento = pagamentos[0]; // Assume uma mãe tem um pagamento
    const parcelas = pagamento ? parcelasByPagamentoId.get(pagamento.id) || [] : [];

    // Use percentual from pagamento if available, otherwise from mae
    const percentual = pagamento?.percentual_comissao ?? mae.percentual_comissao ?? 0;

    let valorTotalPagamento = 0;
    let valorTotalPago = 0;
    let valorTotalPendente = 0;
    let comissaoRecebida = 0;
    let comissaoPendente = 0;

    parcelas.forEach((p) => {
      const valor = p.valor || 0;
      valorTotalPagamento += valor;

      const comissaoParcela = (valor * percentual) / 100;

      if (p.status === "pago") {
        valorTotalPago += valor;
        comissaoRecebida += comissaoParcela;
      } else {
        valorTotalPendente += valor;
        comissaoPendente += comissaoParcela;
      }
    });

    return {
      id: mae.id,
      nome_mae: mae.nome_mae,
      cpf: mae.cpf,
      status_processo: mae.status_processo,
      percentual_comissao: percentual,
      user_id: mae.user_id,
      usuario_nome: profile?.full_name || null,
      usuario_email: profile?.email || null,
      pagamento_id: pagamento?.id || null,
      valor_total_pagamento: valorTotalPagamento,
      valor_total_pago: valorTotalPago,
      valor_total_pendente: valorTotalPendente,
      comissao_calculada: comissaoRecebida + comissaoPendente,
      comissao_recebida: comissaoRecebida,
      comissao_pendente: comissaoPendente,
      parcelas: parcelas.map((p) => ({
        id: p.id,
        numero_parcela: p.numero_parcela,
        valor: p.valor,
        status: p.status,
        data_pagamento: p.data_pagamento,
        valor_comissao: p.valor ? (p.valor * percentual) / 100 : null,
      })),
    };
  });

  // Group by user
  const resumoPorUsuario: ComissaoResumoUsuario[] = [];
  const userGroupMap = new Map<string, ComissaoResumoUsuario>();

  maesComComissao.forEach((mae) => {
    if (!userGroupMap.has(mae.user_id)) {
      userGroupMap.set(mae.user_id, {
        user_id: mae.user_id,
        usuario_nome: mae.usuario_nome,
        usuario_email: mae.usuario_email,
        total_maes: 0,
        maes_aprovadas: 0,
        valor_total_pagamentos: 0,
        comissao_total: 0,
        comissao_recebida: 0,
        comissao_pendente: 0,
      });
    }

    const group = userGroupMap.get(mae.user_id)!;
    group.total_maes += 1;
    group.maes_aprovadas += 1;
    group.valor_total_pagamentos += mae.valor_total_pagamento;
    group.comissao_total += mae.comissao_calculada;
    group.comissao_recebida += mae.comissao_recebida;
    group.comissao_pendente += mae.comissao_pendente;
  });

  userGroupMap.forEach((value) => {
    resumoPorUsuario.push(value);
  });

  return { maesComComissao, resumoPorUsuario };
}

export function useComissoes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["comissoes"],
    queryFn: fetchComissoes,
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("comissoes-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "mae_processo" }, () => {
        queryClient.invalidateQueries({ queryKey: ["comissoes"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "pagamentos_mae" }, () => {
        queryClient.invalidateQueries({ queryKey: ["comissoes"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "parcelas_pagamento" }, () => {
        queryClient.invalidateQueries({ queryKey: ["comissoes"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["comissoes"] });
  };

  return {
    maesComComissao: query.data?.maesComComissao || [],
    resumoPorUsuario: query.data?.resumoPorUsuario || [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch,
  };
}
