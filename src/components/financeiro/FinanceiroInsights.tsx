import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, ArrowUpDown, Calendar, Zap } from "lucide-react";
import { parseISO, getMonth, getYear, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import type { PagamentoComMae } from "@/hooks/usePagamentos";
import type { Despesa } from "@/types/despesa";
import { CATEGORIA_LABELS, type CategoriaDespesa } from "@/types/despesa";
import type { FilterPeriod } from "./FinanceiroFilters";

interface FinanceiroInsightsProps {
  pagamentos: PagamentoComMae[];
  despesas: Despesa[];
  period: FilterPeriod;
  selectedMonth: number;
  selectedYear: number;
}

function getMonthTotals(
  pagamentos: PagamentoComMae[],
  despesas: Despesa[],
  month: number,
  year: number,
) {
  let entrou = 0;
  pagamentos.forEach((pag) => {
    pag.parcelas.forEach((p) => {
      if (!p.data_pagamento || p.status === "inadimplente") return;
      try {
        const d = parseISO(p.data_pagamento);
        if (getMonth(d) === month && getYear(d) === year) entrou += p.valor || 0;
      } catch { /* skip */ }
    });
  });

  let saiu = 0;
  const catMap = new Map<string, number>();
  const fornMap = new Map<string, number>();

  despesas.forEach((d) => {
    try {
      const dd = parseISO(d.data_vencimento);
      if (getMonth(dd) === month && getYear(dd) === year) {
        saiu += d.valor;
        const catKey = d.categoria;
        catMap.set(catKey, (catMap.get(catKey) || 0) + d.valor);
        const fornKey = d.fornecedor || d.categoria;
        fornMap.set(fornKey, (fornMap.get(fornKey) || 0) + d.valor);
      }
    } catch { /* skip */ }
  });

  return { entrou, saiu, sobrou: entrou - saiu, catMap, fornMap };
}

function get12MonthTotals(
  pagamentos: PagamentoComMae[],
  despesas: Despesa[],
  endMonth: number,
  endYear: number,
) {
  let entrou = 0, saiu = 0;
  for (let i = 0; i < 12; i++) {
    const d = subMonths(new Date(endYear, endMonth, 1), i);
    const t = getMonthTotals(pagamentos, despesas, getMonth(d), getYear(d));
    entrou += t.entrou;
    saiu += t.saiu;
  }
  return { entrou, saiu, sobrou: entrou - saiu };
}

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(v);

const fmtCompact = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return fmtCurrency(v);
};

function calcDelta(cur: number, prev: number): { diffR: number; diffPct: number | null } {
  const diffR = cur - prev;
  const diffPct = prev !== 0 ? ((cur - prev) / Math.abs(prev)) * 100 : null;
  return { diffR, diffPct };
}

export function FinanceiroInsights({
  pagamentos,
  despesas,
  period,
  selectedMonth,
  selectedYear,
}: FinanceiroInsightsProps) {
  const data = useMemo(() => {
    // Current month totals
    const cur = getMonthTotals(pagamentos, despesas, selectedMonth, selectedYear);
    const prevDate = subMonths(new Date(selectedYear, selectedMonth, 1), 1);
    const prev = getMonthTotals(pagamentos, despesas, getMonth(prevDate), getYear(prevDate));

    // TTM
    const ttmCur = get12MonthTotals(pagamentos, despesas, selectedMonth, selectedYear);
    const prev12Start = subMonths(new Date(selectedYear, selectedMonth, 1), 12);
    const ttmPrev = get12MonthTotals(pagamentos, despesas, getMonth(prev12Start), getYear(prev12Start));

    // Impact analysis: compare fornecedor/category spending vs prev month
    const impacts: { name: string; curVal: number; prevVal: number; diff: number }[] = [];
    const allKeys = new Set([...cur.fornMap.keys(), ...prev.fornMap.keys()]);
    allKeys.forEach((key) => {
      const c = cur.fornMap.get(key) || 0;
      const p = prev.fornMap.get(key) || 0;
      if (c !== p) {
        const label = CATEGORIA_LABELS[key as CategoriaDespesa] || key;
        impacts.push({ name: label, curVal: c, prevVal: p, diff: c - p });
      }
    });
    impacts.sort((a, b) => b.diff - a.diff);
    const topIncrease = impacts.filter((i) => i.diff > 0).slice(0, 3);
    const topDecrease = impacts.filter((i) => i.diff < 0).slice(0, 3);

    return { cur, prev, ttmCur, ttmPrev, topIncrease, topDecrease };
  }, [pagamentos, despesas, selectedMonth, selectedYear]);

  const renderKpi = (label: string, current: number, previous: number, invertColor?: boolean) => {
    const { diffR, diffPct } = calcDelta(current, previous);
    const positive = invertColor ? diffR <= 0 : diffR >= 0;
    const colorClass = positive ? "text-primary" : "text-destructive";
    const Icon = diffR >= 0 ? TrendingUp : TrendingDown;

    return (
      <div className="rounded-lg border bg-card p-3 space-y-1">
        <p className="text-[10px] md:text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-base md:text-lg font-bold">{fmtCurrency(current)}</p>
        <div className={`flex items-center gap-1 text-xs font-medium ${colorClass}`}>
          {diffPct !== null ? (
            <>
              <Icon className="h-3 w-3" />
              <span>{diffPct >= 0 ? "+" : ""}{diffPct.toFixed(0)}%</span>
              <span className="text-muted-foreground font-normal">
                ({diffR >= 0 ? "+" : ""}{fmtCompact(diffR)})
              </span>
            </>
          ) : (
            <>
              <Minus className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">—</span>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderTtmMetric = (label: string, current: number, previous: number, invertColor?: boolean) => {
    const { diffPct } = calcDelta(current, previous);
    const positive = invertColor ? (diffPct !== null && diffPct <= 0) : (diffPct !== null && diffPct >= 0);
    const colorClass = diffPct === null ? "text-muted-foreground" : positive ? "text-primary" : "text-destructive";

    return (
      <div className="text-center space-y-0.5">
        <p className="text-[10px] md:text-xs text-muted-foreground">{label}</p>
        <p className="text-sm md:text-base font-bold">{fmtCurrency(current)}</p>
        {diffPct !== null ? (
          <p className={`text-[10px] md:text-xs font-medium ${colorClass}`}>
            {diffPct >= 0 ? "+" : ""}{diffPct.toFixed(0)}% vs 12m ant.
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground">—</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Comparado ao mês passado */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5" />
          Comparado ao mês passado
        </h3>
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          {renderKpi("Entrou", data.cur.entrou, data.prev.entrou)}
          {renderKpi("Saiu", data.cur.saiu, data.prev.saiu, true)}
          {renderKpi("Sobrou", data.cur.sobrou, data.prev.sobrou)}
        </div>
      </div>

      {/* TTM */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Últimos 12 meses (TTM)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {renderTtmMetric("Entrou", data.ttmCur.entrou, data.ttmPrev.entrou)}
            {renderTtmMetric("Saiu", data.ttmCur.saiu, data.ttmPrev.saiu, true)}
            {renderTtmMetric("Sobrou", data.ttmCur.sobrou, data.ttmPrev.sobrou)}
          </div>
        </CardContent>
      </Card>

      {/* O que mais impactou */}
      {(data.topIncrease.length > 0 || data.topDecrease.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              O que mais impactou este mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Aumentaram */}
              {data.topIncrease.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-destructive mb-1.5 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Gastou mais
                  </p>
                  <div className="space-y-1.5">
                    {data.topIncrease.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <span className="truncate mr-2">{item.name}</span>
                        <span className="text-destructive font-medium whitespace-nowrap">
                          +{fmtCompact(item.diff)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Reduziram */}
              {data.topDecrease.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    Gastou menos
                  </p>
                  <div className="space-y-1.5">
                    {data.topDecrease.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <span className="truncate mr-2">{item.name}</span>
                        <span className="text-primary font-medium whitespace-nowrap">
                          {fmtCompact(item.diff)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
