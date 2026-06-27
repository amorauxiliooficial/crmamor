import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseISO, startOfMonth, endOfMonth, addMonths, format, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePagamentos, type PagamentoComMae } from "@/hooks/usePagamentos";
import { useDespesas } from "@/hooks/useDespesas";

const TICKET_AVISTA_FALLBACK = 1900;
const TICKET_PARCELADO_MES_FALLBACK = 450;

export interface ExecutivoKpis {
  receitaPrevistaMes: number;
  receitaRecebidaMes: number;
  metaMes: number;
  gapPrevisto: number;
  gapRecebido: number;
  saldoOperacional: number;
  despesasMes: number;
}

export interface CarteiraFinanceira {
  totalContratado: number;
  totalRecebido: number;
  totalAReceber: number;
  qtdMaesAVista: number;
  valorAVista: number;
  qtdMaesParceladas: number;
  valorParcelado: number;
  pctAVista: number;
  pctParcelado: number;
}

export interface ComposicaoSugerida {
  gap: number;
  ticketAVista: number;
  ticketParceladoMes: number;
  opcaoAVista: number;
  opcaoParcelada: number;
  opcaoMistaAVista: number;
  opcaoMistaParcelada: number;
}

export interface RecebimentoItem {
  id: string;
  data: string;
  nome: string;
  parcela: string;
  valor: number;
  tipo: string;
  status: string;
}

export interface ProximoMesPrev {
  key: string;
  label: string;
  valor: number;
}

const isAVista = (tipo: string) => /vista/i.test(tipo || "");

function fetchMetaMes(mes: number, ano: number) {
  // periodo formato esperado: "YYYY-MM" ou "mensal"; pegamos a meta mensal mais recente
  return supabase
    .from("metas_config")
    .select("*")
    .eq("ativo", true)
    .ilike("tipo_meta", "%receita%");
}

export function useExecutiveForecast(refDate: Date) {
  const { pagamentos, isLoading: loadingPag } = usePagamentos();
  const { despesas, isLoading: loadingDesp } = useDespesas();
  const queryClient = useQueryClient();

  const metasQuery = useQuery({
    queryKey: ["metas_config_receita"],
    queryFn: async () => {
      const { data, error } = await fetchMetaMes(refDate.getMonth(), refDate.getFullYear());
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("metas_config_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "metas_config" },
        () => queryClient.invalidateQueries({ queryKey: ["metas_config_receita"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useMemo(() => {
    const monthStart = startOfMonth(refDate);
    const monthEnd = endOfMonth(refDate);
    const today = new Date();

    // ---- KPIs ----
    let receitaPrevistaMes = 0;
    let receitaRecebidaMes = 0;

    pagamentos.forEach((pag) => {
      pag.parcelas.forEach((p) => {
        if (!p.data_pagamento || !p.valor) return;
        let d: Date;
        try {
          d = parseISO(p.data_pagamento);
        } catch {
          return;
        }
        if (!isWithinInterval(d, { start: monthStart, end: monthEnd })) return;
        if (p.status === "pago") {
          receitaRecebidaMes += p.valor;
        } else if (p.status !== "inadimplente") {
          receitaPrevistaMes += p.valor;
        }
      });
    });

    // ---- Meta mês ----
    const metasReceita = metasQuery.data ?? [];
    const refLabel = format(refDate, "yyyy-MM");
    const metaRow =
      metasReceita.find((m: any) => m.periodo === refLabel) ??
      metasReceita.find((m: any) => m.periodo === "mensal") ??
      metasReceita[0];
    const metaMes = metaRow ? Number((metaRow as any).valor_meta) || 0 : 0;

    const gapPrevisto = metaMes - (receitaRecebidaMes + receitaPrevistaMes);
    const gapRecebido = metaMes - receitaRecebidaMes;

    // ---- Despesas do mês ----
    let despesasMes = 0;
    despesas.forEach((d) => {
      try {
        const dt = parseISO(d.data_vencimento);
        if (isWithinInterval(dt, { start: monthStart, end: monthEnd })) {
          despesasMes += Number(d.valor) || 0;
        }
      } catch {
        /* skip */
      }
    });
    const saldoOperacional = receitaRecebidaMes - despesasMes;

    const kpis: ExecutivoKpis = {
      receitaPrevistaMes,
      receitaRecebidaMes,
      metaMes,
      gapPrevisto,
      gapRecebido,
      saldoOperacional,
      despesasMes,
    };

    // ---- Próximos 6 meses (inclui o mês atual de referência? usuário pediu próximos 6) ----
    const proximos: ProximoMesPrev[] = [];
    for (let i = 0; i < 6; i++) {
      const m = addMonths(monthStart, i + 1);
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      let valor = 0;
      pagamentos.forEach((pag) => {
        pag.parcelas.forEach((p) => {
          if (!p.data_pagamento || !p.valor) return;
          if (p.status === "pago" || p.status === "inadimplente") return;
          try {
            const d = parseISO(p.data_pagamento);
            if (isWithinInterval(d, { start: mStart, end: mEnd })) valor += p.valor;
          } catch {
            /* skip */
          }
        });
      });
      proximos.push({
        key: format(m, "yyyy-MM"),
        label: format(m, "MMM/yy", { locale: ptBR }),
        valor,
      });
    }
    const totalProximos = proximos.reduce((a, p) => a + p.valor, 0);
    const mediaProximos = proximos.length ? totalProximos / proximos.length : 0;

    // ---- Carteira ----
    let totalContratado = 0;
    let totalRecebido = 0;
    let qtdMaesAVista = 0;
    let qtdMaesParceladas = 0;
    let valorAVista = 0;
    let valorParcelado = 0;
    const avistaValores: number[] = [];
    const parcelaValores: number[] = [];

    pagamentos.forEach((pag) => {
      const valTotal = Number(pag.valor_total) || 0;
      totalContratado += valTotal;
      pag.parcelas.forEach((p) => {
        if (p.status === "pago") totalRecebido += Number(p.valor) || 0;
        if (!isAVista(pag.tipo_pagamento) && p.valor) parcelaValores.push(Number(p.valor));
      });
      if (isAVista(pag.tipo_pagamento)) {
        qtdMaesAVista += 1;
        valorAVista += valTotal;
        if (valTotal) avistaValores.push(valTotal);
      } else {
        qtdMaesParceladas += 1;
        valorParcelado += valTotal;
      }
    });
    const totalAReceber = Math.max(totalContratado - totalRecebido, 0);
    const carteira: CarteiraFinanceira = {
      totalContratado,
      totalRecebido,
      totalAReceber,
      qtdMaesAVista,
      valorAVista,
      qtdMaesParceladas,
      valorParcelado,
      pctAVista: totalContratado ? (valorAVista / totalContratado) * 100 : 0,
      pctParcelado: totalContratado ? (valorParcelado / totalContratado) * 100 : 0,
    };

    // ---- Composição sugerida ----
    const ticketAVista = avistaValores.length
      ? avistaValores.reduce((a, b) => a + b, 0) / avistaValores.length
      : TICKET_AVISTA_FALLBACK;
    const ticketParceladoMes = parcelaValores.length
      ? parcelaValores.reduce((a, b) => a + b, 0) / parcelaValores.length
      : TICKET_PARCELADO_MES_FALLBACK;

    const gap = Math.max(gapPrevisto, 0);
    const opcaoAVista = ticketAVista > 0 ? Math.ceil(gap / ticketAVista) : 0;
    const opcaoParcelada = ticketParceladoMes > 0 ? Math.ceil(gap / ticketParceladoMes) : 0;
    const mistaAVista = Math.max(Math.floor(opcaoAVista / 2), 1);
    const restanteMista = Math.max(gap - mistaAVista * ticketAVista, 0);
    const mistaParcelada = ticketParceladoMes > 0 ? Math.ceil(restanteMista / ticketParceladoMes) : 0;

    const composicao: ComposicaoSugerida = {
      gap,
      ticketAVista,
      ticketParceladoMes,
      opcaoAVista,
      opcaoParcelada,
      opcaoMistaAVista: gap > 0 ? mistaAVista : 0,
      opcaoMistaParcelada: gap > 0 ? mistaParcelada : 0,
    };

    // ---- Últimas entradas (pagamentos recebidos mais recentes) ----
    const ultimas: RecebimentoItem[] = [];
    pagamentos.forEach((pag) => {
      pag.parcelas.forEach((p) => {
        if (p.status !== "pago" || !p.data_pagamento || !p.valor) return;
        ultimas.push({
          id: p.id,
          data: p.data_pagamento,
          nome: pag.mae_nome,
          parcela: `${p.numero_parcela}/${pag.total_parcelas}`,
          valor: p.valor,
          tipo: pag.tipo_pagamento,
          status: p.status,
        });
      });
    });
    ultimas.sort((a, b) => (a.data < b.data ? 1 : -1));
    const ultimasEntradas = ultimas.slice(0, 10);

    // ---- Próximos recebimentos (parcelas futuras pendentes) ----
    const proximosRec: RecebimentoItem[] = [];
    pagamentos.forEach((pag) => {
      pag.parcelas.forEach((p) => {
        if (p.status === "pago" || p.status === "inadimplente") return;
        if (!p.data_pagamento || !p.valor) return;
        let d: Date;
        try {
          d = parseISO(p.data_pagamento);
        } catch {
          return;
        }
        if (d < today) return;
        proximosRec.push({
          id: p.id,
          data: p.data_pagamento,
          nome: pag.mae_nome,
          parcela: `${p.numero_parcela}/${pag.total_parcelas}`,
          valor: p.valor,
          tipo: pag.tipo_pagamento,
          status: p.status,
        });
      });
    });
    proximosRec.sort((a, b) => (a.data < b.data ? -1 : 1));
    const proximosRecebimentos = proximosRec.slice(0, 10);

    return {
      kpis,
      carteira,
      composicao,
      proximos6Meses: proximos,
      totalProximos,
      mediaProximos,
      ultimasEntradas,
      proximosRecebimentos,
      loading: loadingPag || loadingDesp || metasQuery.isLoading,
    };
  }, [pagamentos, despesas, metasQuery.data, metasQuery.isLoading, refDate, loadingPag, loadingDesp]);
}
