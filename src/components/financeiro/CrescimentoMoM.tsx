import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import {
  format, startOfMonth, endOfMonth, eachMonthOfInterval,
  subMonths, parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import type { PagamentoComMae } from "@/hooks/usePagamentos";
import type { Despesa } from "@/types/despesa";
import type { FilterPeriod } from "./FinanceiroFilters";

interface CrescimentoMoMProps {
  pagamentos: PagamentoComMae[];
  despesas: Despesa[];
  period: FilterPeriod;
  selectedMonth: number;
  selectedYear: number;
}

function getMonthlyTotals(
  pagamentos: PagamentoComMae[],
  despesas: Despesa[],
  months: Date[],
) {
  return months.map((month) => {
    const ms = startOfMonth(month);
    const me = endOfMonth(month);

    let receitas = 0;
    pagamentos.forEach((pag) => {
      pag.parcelas.forEach((p) => {
        if (!p.data_pagamento || p.status === "inadimplente") return;
        try {
          const d = parseISO(p.data_pagamento);
          if (d >= ms && d <= me) receitas += p.valor || 0;
        } catch { /* skip */ }
      });
    });

    let despesasTotal = 0;
    despesas.forEach((d) => {
      try {
        const dd = parseISO(d.data_vencimento);
        if (dd >= ms && dd <= me) despesasTotal += d.valor;
      } catch { /* skip */ }
    });

    return {
      month,
      label: format(month, "MMM", { locale: ptBR }),
      fullLabel: format(month, "MMMM/yyyy", { locale: ptBR }),
      receitas,
      despesas: despesasTotal,
      resultado: receitas - despesasTotal,
    };
  });
}

function calcMoM(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function CrescimentoMoM({
  pagamentos,
  despesas,
  period,
  selectedMonth,
  selectedYear,
}: CrescimentoMoMProps) {
  const { kpis, chartData } = useMemo(() => {
    const now = new Date();
    // Always compute 13 months so we can calculate MoM for all 12
    const startDate = startOfMonth(subMonths(now, 12));
    const endDate = endOfMonth(now);
    const allMonths = eachMonthOfInterval({ start: startDate, end: endDate });
    const totals = getMonthlyTotals(pagamentos, despesas, allMonths);

    // Build chart data with MoM % for the last 12 entries (skip first which is baseline)
    const chart = totals.slice(1).map((cur, i) => {
      const prev = totals[i]; // previous month
      return {
        name: cur.label,
        fullName: cur.fullLabel,
        receitaMoM: calcMoM(cur.receitas, prev.receitas),
        despesaMoM: calcMoM(cur.despesas, prev.despesas),
        resultadoMoM: calcMoM(cur.resultado, prev.resultado),
      };
    });

    // KPIs: depends on period
    let currentIdx: number;
    let prevIdx: number;

    if (period === "mes") {
      // Find the selected month in totals
      currentIdx = totals.findIndex(
        (t) => t.month.getMonth() === selectedMonth && t.month.getFullYear() === selectedYear,
      );
      prevIdx = currentIdx > 0 ? currentIdx - 1 : -1;
    } else {
      // For "ano" and "total", use last available month vs previous
      currentIdx = totals.length - 1;
      prevIdx = totals.length - 2;
    }

    const cur = currentIdx >= 0 ? totals[currentIdx] : null;
    const prev = prevIdx >= 0 ? totals[prevIdx] : null;

    const kpiData = {
      receitaMoM: cur && prev ? calcMoM(cur.receitas, prev.receitas) : null,
      despesaMoM: cur && prev ? calcMoM(cur.despesas, prev.despesas) : null,
      resultadoMoM: cur && prev ? calcMoM(cur.resultado, prev.resultado) : null,
    };

    return { kpis: kpiData, chartData: chart };
  }, [pagamentos, despesas, period, selectedMonth, selectedYear]);

  const renderKpiBadge = (label: string, value: number | null, invertColor?: boolean) => {
    if (value === null) {
      return (
        <div className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 min-w-0">
          <Minus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-sm md:text-base font-semibold text-muted-foreground">—</p>
          </div>
        </div>
      );
    }

    const isPositive = invertColor ? value <= 0 : value >= 0;
    const Icon = value >= 0 ? TrendingUp : TrendingDown;
    const colorClass = isPositive ? "text-primary" : "text-destructive";

    return (
      <div className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 min-w-0">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${colorClass}`} />
        <div className="min-w-0">
          <p className="text-[10px] md:text-xs text-muted-foreground truncate">{label}</p>
          <p className={`text-sm md:text-base font-semibold ${colorClass}`}>
            {value >= 0 ? "+" : ""}{value.toFixed(1)}%
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* KPI Chips */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {renderKpiBadge("Receita MoM", kpis.receitaMoM)}
        {renderKpiBadge("Despesa MoM", kpis.despesaMoM, true)}
        {renderKpiBadge("Resultado MoM", kpis.resultadoMoM)}
      </div>

      {/* MoM Growth Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Crescimento MoM (%)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  className="text-muted-foreground"
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  className="text-muted-foreground"
                  width={50}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted)/0.3)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    const fmt = (v: number | null) =>
                      v === null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
                    return (
                      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-[160px]">
                        <p className="font-semibold text-sm mb-2 capitalize">{data.fullName}</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-primary">Receita:</span>
                            <span className="font-semibold">{fmt(data.receitaMoM)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-destructive">Despesa:</span>
                            <span className="font-semibold">{fmt(data.despesaMoM)}</span>
                          </div>
                          <div className="flex justify-between border-t pt-1">
                            <span>Resultado:</span>
                            <span className="font-bold">{fmt(data.resultadoMoM)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "8px" }}
                  formatter={(value) => (
                    <span className="text-xs font-medium">
                      {value === "receitaMoM"
                        ? "Receita"
                        : value === "despesaMoM"
                        ? "Despesa"
                        : "Resultado"}
                    </span>
                  )}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                <Bar
                  dataKey="receitaMoM"
                  fill="hsl(var(--primary))"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={24}
                />
                <Bar
                  dataKey="despesaMoM"
                  fill="hsl(var(--destructive))"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={24}
                />
                <Bar
                  dataKey="resultadoMoM"
                  fill="hsl(var(--accent-foreground))"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
