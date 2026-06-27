import { parseISO, isWithinInterval, startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PagamentoCompleto } from "@/types/pagamento";
import type { Despesa } from "@/types/despesa";
import type {
  CarteiraFinanceira,
  ExecutivoKpis,
  ForecastMesItem,
} from "@/hooks/useExecutiveForecast";
import type { DrillRecord, DrillSpec } from "./MetricDrillSheet";

const COLOR_RECEBIDO = "hsl(142 70% 45%)";
const COLOR_PREVISTO = "hsl(217 91% 60%)";
const COLOR_PRIMARY = "hsl(var(--primary))";
const COLOR_WARNING = "hsl(38 92% 55%)";
const COLOR_DANGER = "hsl(0 72% 50%)";

interface Ctx {
  refDate: Date;
  pagamentos: PagamentoCompleto[];
  despesas: Despesa[];
  kpis: ExecutivoKpis;
  carteira: CarteiraFinanceira;
  formatBRL: (n: number) => string;
}

function inMonth(iso: string | null | undefined, start: Date, end: Date) {
  if (!iso) return false;
  try {
    return isWithinInterval(parseISO(iso), { start, end });
  } catch {
    return false;
  }
}

export function buildKpiSpec(
  id: "prevista" | "recebida" | "meta" | "gap" | "saldo",
  ctx: Ctx,
): DrillSpec {
  const { refDate, pagamentos, despesas, kpis, formatBRL } = ctx;
  const start = startOfMonth(refDate);
  const end = endOfMonth(refDate);
  const monthLabel = format(refDate, "MMMM 'de' yyyy", { locale: ptBR });

  if (id === "prevista") {
    const records: DrillRecord[] = [];
    pagamentos.forEach((pag) => {
      pag.parcelas.forEach((p) => {
        if (!inMonth(p.data_pagamento, start, end)) return;
        if (p.status === "pago" || p.status === "inadimplente") return;
        records.push({
          id: p.id,
          nome: pag.mae_nome,
          data: p.data_pagamento ?? undefined,
          valor: Number(p.valor) || 0,
          meta: `Parcela ${p.numero_parcela}/${pag.total_parcelas}`,
          tone: "info",
        });
      });
    });
    records.sort((a, b) => (a.data ?? "") < (b.data ?? "") ? -1 : 1);
    return {
      title: "Receita Prevista",
      subtitle: `Parcelas a vencer em ${monthLabel}`,
      value: kpis.receitaPrevistaMes,
      valueLabel: "Total previsto",
      accent: "bg-sky-500/15 text-sky-600",
      formula: {
        expr: "Σ valor das parcelas (status ≠ pago, ≠ inadimplente) com vencimento no mês",
        explain: [
          "Considera somente parcelas com data_pagamento dentro do mês selecionado.",
          "Exclui parcelas já pagas (entram em 'Receita Recebida') e inadimplentes.",
          "Soma o campo valor de cada parcela.",
        ],
        source: "Tabela pagamentos_mae → parcelas_pagamento (hook usePagamentos).",
      },
      composition: [
        { label: "À Vista", value: records.filter((r) => /vista/i.test(r.meta ?? "")).reduce((a, b) => a + b.valor, 0), color: COLOR_PRIMARY },
        { label: "Parcelado", value: records.filter((r) => !/vista/i.test(r.meta ?? "")).reduce((a, b) => a + b.valor, 0), color: COLOR_PREVISTO },
      ],
      records,
      recordsLabel: "Parcelas previstas no período",
    };
  }

  if (id === "recebida") {
    const records: DrillRecord[] = [];
    pagamentos.forEach((pag) => {
      pag.parcelas.forEach((p) => {
        if (!inMonth(p.data_pagamento, start, end)) return;
        if (p.status !== "pago") return;
        records.push({
          id: p.id,
          nome: pag.mae_nome,
          data: p.data_pagamento ?? undefined,
          valor: Number(p.valor) || 0,
          meta: `Parcela ${p.numero_parcela}/${pag.total_parcelas}`,
          tone: "success",
        });
      });
    });
    records.sort((a, b) => (a.data ?? "") < (b.data ?? "") ? 1 : -1);
    return {
      title: "Receita Recebida",
      subtitle: `Pagamentos confirmados em ${monthLabel}`,
      value: kpis.receitaRecebidaMes,
      valueLabel: "Total recebido",
      accent: "bg-emerald-500/15 text-emerald-600",
      formula: {
        expr: "Σ valor das parcelas com status = 'pago' e data_pagamento no mês",
        explain: [
          "Somatório das parcelas marcadas como pagas no período.",
          "Considera a data efetiva de pagamento (data_pagamento).",
        ],
        source: "Tabela parcelas_pagamento (hook usePagamentos).",
      },
      records,
      recordsLabel: "Recebimentos confirmados",
    };
  }

  if (id === "meta") {
    return {
      title: "Meta do Mês",
      subtitle: monthLabel,
      value: kpis.metaMes,
      valueLabel: "Meta configurada",
      accent: "bg-primary/15 text-primary",
      formula: {
        expr: "metas_config.valor_meta WHERE tipo_meta ~ 'receita' E periodo = mês atual",
        explain: [
          "Busca primeiro a meta específica do mês (formato yyyy-MM).",
          "Se não houver, usa a meta marcada como 'mensal' (recorrente).",
          "Editável por administradores no botão 'Editar meta'.",
        ],
        source: "Tabela metas_config (filtrada por tipo_meta contendo 'receita').",
      },
      composition: [
        { label: "Recebido", value: kpis.receitaRecebidaMes, color: COLOR_RECEBIDO },
        { label: "Previsto", value: kpis.receitaPrevistaMes, color: COLOR_PREVISTO },
        { label: "Gap", value: Math.max(kpis.gapPrevisto, 0), color: COLOR_WARNING },
      ],
      records: [],
      emptyHint: "Meta é um número configurável, não tem registros individuais.",
    };
  }

  if (id === "gap") {
    return {
      title: "Gap para a Meta",
      subtitle: `Diferença entre o previsto e a meta de ${monthLabel}`,
      value: Math.abs(kpis.gapPrevisto),
      valueLabel: kpis.gapPrevisto > 0 ? "Falta atingir" : "Excedente",
      accent: kpis.gapPrevisto > 0 ? "bg-rose-500/15 text-rose-600" : "bg-emerald-500/15 text-emerald-600",
      formula: {
        expr: "gap = meta_mes − (receita_recebida + receita_prevista)",
        explain: [
          `Meta do mês: ${formatBRL(kpis.metaMes)}`,
          `Receita recebida: ${formatBRL(kpis.receitaRecebidaMes)}`,
          `Receita prevista: ${formatBRL(kpis.receitaPrevistaMes)}`,
          kpis.gapPrevisto > 0
            ? "Valor positivo significa que falta gerar receita extra para bater a meta."
            : "Valor negativo significa que a meta já foi superada na projeção.",
        ],
        source: "Calculado em useExecutiveForecast a partir dos KPIs do mês.",
      },
      composition: [
        { label: "Recebido", value: kpis.receitaRecebidaMes, color: COLOR_RECEBIDO },
        { label: "Previsto", value: kpis.receitaPrevistaMes, color: COLOR_PREVISTO },
        { label: "Gap", value: Math.max(kpis.gapPrevisto, 0), color: COLOR_DANGER },
      ],
      records: [],
      emptyHint: "O gap é um valor calculado — veja 'Como bater a meta' para sugestões.",
    };
  }

  // saldo
  const despesasRecords: DrillRecord[] = [];
  despesas.forEach((d) => {
    if (!inMonth(d.data_vencimento, start, end)) return;
    despesasRecords.push({
      id: d.id,
      nome: d.descricao || "Despesa",
      data: d.data_vencimento,
      valor: -(Number(d.valor) || 0),
      meta: d.categoria ?? undefined,
      tone: "danger",
    });
  });
  return {
    title: "Saldo Operacional",
    subtitle: `Recebido − despesas em ${monthLabel}`,
    value: kpis.saldoOperacional,
    valueLabel: "Saldo do mês",
    accent: kpis.saldoOperacional >= 0 ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600",
    formula: {
      expr: "saldo = receita_recebida − Σ despesas (data_vencimento no mês)",
      explain: [
        `Receita recebida: ${formatBRL(kpis.receitaRecebidaMes)}`,
        `Despesas do mês: ${formatBRL(kpis.despesasMes)}`,
        "Considera despesas com data_vencimento dentro do mês selecionado.",
      ],
      source: "Tabelas pagamentos_mae (parcelas pagas) e despesas (hooks usePagamentos + useDespesas).",
    },
    composition: [
      { label: "Recebido", value: kpis.receitaRecebidaMes, color: COLOR_RECEBIDO },
      { label: "Despesas", value: kpis.despesasMes, color: COLOR_DANGER },
    ],
    records: despesasRecords,
    recordsLabel: "Despesas do mês",
    emptyHint: "Nenhuma despesa lançada para este mês.",
  };
}

export function buildForecastMonthSpec(month: ForecastMesItem, ctx: Ctx): DrillSpec {
  const { pagamentos, formatBRL } = ctx;
  const [y, m] = month.key.split("-").map(Number);
  const start = startOfMonth(new Date(y, m - 1, 1));
  const end = endOfMonth(new Date(y, m - 1, 1));
  const records: DrillRecord[] = [];
  pagamentos.forEach((pag) => {
    pag.parcelas.forEach((p) => {
      if (!inMonth(p.data_pagamento, start, end)) return;
      if (p.status === "inadimplente") return;
      records.push({
        id: p.id,
        nome: pag.mae_nome,
        data: p.data_pagamento ?? undefined,
        valor: Number(p.valor) || 0,
        meta: p.status === "pago" ? "Recebido" : "Previsto",
        tone: p.status === "pago" ? "success" : "info",
      });
    });
  });
  records.sort((a, b) => (a.data ?? "") < (b.data ?? "") ? -1 : 1);

  return {
    title: `Forecast · ${month.label}`,
    subtitle: month.abaixoMeta ? "Mês marcado como em risco (< 80% da meta)" : "Projeção financeira do mês",
    value: month.total,
    valueLabel: "Receita projetada",
    accent: month.abaixoMeta ? "bg-rose-500/15 text-rose-600" : "bg-primary/15 text-primary",
    formula: {
      expr: "total = Σ recebido (pago) + Σ previsto (status ≠ pago, ≠ inadimplente)",
      explain: [
        `Recebido: ${formatBRL(month.recebido)}`,
        `Previsto: ${formatBRL(month.pendente)}`,
        `Meta de referência: ${formatBRL(month.meta)}`,
        "Janela: parcelas com vencimento dentro do mês.",
      ],
      source: "Hook useExecutiveForecast a partir das parcelas de pagamentos_mae.",
    },
    composition: [
      { label: "Recebido", value: month.recebido, color: COLOR_RECEBIDO },
      { label: "Previsto", value: month.pendente, color: COLOR_PREVISTO },
    ],
    records,
    recordsLabel: "Parcelas com vencimento no mês",
  };
}

export function buildCarteiraSpec(
  segment: "avista" | "parcelado" | "recebido" | "areceber",
  ctx: Ctx,
): DrillSpec {
  const { pagamentos, carteira, formatBRL } = ctx;
  const isAVista = (t: string) => /vista/i.test(t || "");

  if (segment === "avista" || segment === "parcelado") {
    const want = segment === "avista";
    const records: DrillRecord[] = pagamentos
      .filter((p) => isAVista(p.tipo_pagamento) === want)
      .map((p) => ({
        id: p.id,
        nome: p.mae_nome,
        valor: Number(p.valor_total) || 0,
        meta: want ? "À Vista" : `${p.total_parcelas}x`,
        tone: want ? "info" : "default",
      }))
      .sort((a, b) => b.valor - a.valor);
    return {
      title: want ? "Carteira · À Vista" : "Carteira · Parcelado",
      subtitle: want ? "Contratos quitados em parcela única" : "Contratos divididos em parcelas",
      value: want ? carteira.valorAVista : carteira.valorParcelado,
      valueLabel: "Total contratado",
      accent: want ? "bg-primary/15 text-primary" : "bg-sky-500/15 text-sky-600",
      formula: {
        expr: `Σ valor_total dos pagamentos onde tipo_pagamento ${want ? "contém" : "não contém"} 'vista'`,
        explain: [
          `Quantidade de mães: ${want ? carteira.qtdMaesAVista : carteira.qtdMaesParceladas}`,
          `Representa ${(want ? carteira.pctAVista : carteira.pctParcelado).toFixed(0)}% do total contratado.`,
        ],
        source: "Tabela pagamentos_mae (hook usePagamentos).",
      },
      records,
      recordsLabel: "Contratos",
    };
  }

  if (segment === "recebido") {
    const records: DrillRecord[] = [];
    pagamentos.forEach((pag) => {
      const recebido = pag.parcelas
        .filter((p) => p.status === "pago")
        .reduce((a, p) => a + (Number(p.valor) || 0), 0);
      if (recebido > 0) {
        records.push({
          id: pag.id,
          nome: pag.mae_nome,
          valor: recebido,
          meta: `${pag.parcelas.filter((p) => p.status === "pago").length}/${pag.total_parcelas} pagas`,
          tone: "success",
        });
      }
    });
    records.sort((a, b) => b.valor - a.valor);
    return {
      title: "Carteira · Já Recebido",
      subtitle: "Valores efetivamente entrados no caixa",
      value: carteira.totalRecebido,
      valueLabel: "Total recebido",
      accent: "bg-emerald-500/15 text-emerald-600",
      formula: {
        expr: "Σ valor das parcelas com status = 'pago' (todos os meses)",
        explain: [
          `Representa ${carteira.pctRecebido.toFixed(0)}% do total contratado.`,
          "Considera o histórico completo de pagamentos, sem recorte por mês.",
        ],
        source: "Tabela parcelas_pagamento (hook usePagamentos).",
      },
      records,
      recordsLabel: "Recebido por mãe",
    };
  }

  // areceber
  const records: DrillRecord[] = [];
  pagamentos.forEach((pag) => {
    const aReceber = pag.parcelas
      .filter((p) => p.status !== "pago" && p.status !== "inadimplente")
      .reduce((a, p) => a + (Number(p.valor) || 0), 0);
    if (aReceber > 0) {
      records.push({
        id: pag.id,
        nome: pag.mae_nome,
        valor: aReceber,
        meta: `${pag.parcelas.filter((p) => p.status !== "pago" && p.status !== "inadimplente").length} em aberto`,
        tone: "warning",
      });
    }
  });
  records.sort((a, b) => b.valor - a.valor);
  return {
    title: "Carteira · A Receber",
    subtitle: "Parcelas em aberto (não pagas e não inadimplentes)",
    value: carteira.totalAReceber,
    valueLabel: "Total a receber",
    accent: "bg-amber-500/15 text-amber-600",
    formula: {
      expr: "Σ valor das parcelas com status ≠ 'pago' E status ≠ 'inadimplente'",
      explain: [
        `Representa ${carteira.pctAReceber.toFixed(0)}% do total contratado.`,
        "Não inclui parcelas marcadas como inadimplentes (que entram em outro fluxo).",
      ],
      source: "Tabela parcelas_pagamento (hook usePagamentos).",
    },
    records,
    recordsLabel: "Saldo a receber por mãe",
  };
}
