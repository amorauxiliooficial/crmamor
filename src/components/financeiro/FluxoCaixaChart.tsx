import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  subMonths,
  addMonths,
  parseISO,
  isAfter,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { PagamentoComMae } from "@/hooks/usePagamentos";
import type { Despesa } from "@/types/despesa";

interface FluxoCaixaChartProps {
  pagamentos: PagamentoComMae[];
  despesas: Despesa[];
}

function useChartData(pagamentos: PagamentoComMae[], despesas: Despesa[]) {
  return useMemo(() => {
    const now = new Date();

    let earliest: Date | null = null;
    pagamentos.forEach((pag) => {
      pag.parcelas.forEach((p) => {
        if (!p.data_pagamento) return;
        try {
          const d = parseISO(p.data_pagamento);
          if (!earliest || d < earliest) earliest = d;
        } catch {
          /* skip */
        }
      });
    });
    despesas.forEach((d) => {
      try {
        const dd = parseISO(d.data_vencimento);
        if (!earliest || dd < earliest) earliest = dd;
      } catch {
        /* skip */
      }
    });

    const startDate = startOfMonth(earliest || subMonths(now, 11));
    const endDate = endOfMonth(addMonths(now, 3));
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    let saldoAcumulado = 0;

    const data = months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const isFuture = isAfter(monthStart, now);

      let receitas = 0;
      pagamentos.forEach((pag) => {
        pag.parcelas.forEach((p) => {
          if (!p.data_pagamento || p.status === "inadimplente") return;
          try {
            const parcelaDate = parseISO(p.data_pagamento);
            if (parcelaDate >= monthStart && parcelaDate <= monthEnd) {
              receitas += p.valor || 0;
            }
          } catch {
            /* skip */
          }
        });
      });

      let despesasTotal = 0;
      despesas.forEach((d) => {
        try {
          const despesaDate = parseISO(d.data_vencimento);
          if (despesaDate >= monthStart && despesaDate <= monthEnd) {
            despesasTotal += d.valor;
          }
        } catch {
          /* skip */
        }
      });

      const resultado = receitas - despesasTotal;
      saldoAcumulado += resultado;

      return {
        name: format(month, "MMM", { locale: ptBR }),
        fullName: format(month, "MMMM/yyyy", { locale: ptBR }),
        receitas,
        despesas: despesasTotal,
        resultado,
        saldoAcumulado,
        isFuture,
      };
    });

    // Moving average (3 months)
    const dataWithMA = data.map((item, i) => {
      let ma = item.resultado;
      if (i >= 2) {
        ma = (data[i].resultado + data[i - 1].resultado + data[i - 2].resultado) / 3;
      } else if (i === 1) {
        ma = (data[i].resultado + data[i - 1].resultado) / 2;
      }
      return { ...item, mediaMovel3: ma };
    });

    // Stats
    const pastData = dataWithMA.filter((d) => !d.isFuture);
    const active = pastData.filter((d) => d.receitas > 0 || d.despesas > 0);
    let best = active[0] || null;
    let worst = active[0] || null;
    active.forEach((d) => {
      if (d.resultado > (best?.resultado ?? -Infinity)) best = d;
      if (d.resultado < (worst?.resultado ?? Infinity)) worst = d;
    });

    const totalReceitas = pastData.reduce((a, d) => a + d.receitas, 0);
    const totalDespesas = pastData.reduce((a, d) => a + d.despesas, 0);

    // Last 3 months trend
    const last3 = pastData.slice(-3);
    const avgLast3 = last3.length > 0 ? last3.reduce((a, d) => a + d.resultado, 0) / last3.length : 0;
    const prev3 = pastData.slice(-6, -3);
    const avgPrev3 = prev3.length > 0 ? prev3.reduce((a, d) => a + d.resultado, 0) / prev3.length : 0;
    const trendPercent = avgPrev3 !== 0 ? ((avgLast3 - avgPrev3) / Math.abs(avgPrev3)) * 100 : 0;

    return {
      chartData: dataWithMA,
      totalReceitas,
      totalDespesas,
      saldoTotal: totalReceitas - totalDespesas,
      bestMonth: best,
      worstMonth: worst,
      trendPercent,
      avgLast3,
    };
  }, [pagamentos, despesas]);
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(value);

const formatCompact = (value: number) => {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return value.toString();
};

export function FluxoCaixaChart({ pagamentos, despesas }: FluxoCaixaChartProps) {
  const {
    chartData,
    totalReceitas,
    totalDespesas,
    saldoTotal,
    bestMonth,
    worstMonth,
    trendPercent,
    avgLast3,
  } = useChartData(pagamentos, despesas);

  const TrendIcon = trendPercent > 0 ? ArrowUpRight : trendPercent < 0 ? ArrowDownRight : Minus;
  const trendColor = trendPercent > 0 ? "text-emerald-600" : trendPercent < 0 ? "text-red-500" : "text-muted-foreground";

  return (
    <Card className="lg:col-span-2 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Fluxo de Caixa
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="Total Entrou"
            value={formatCurrency(totalReceitas)}
            className="text-emerald-600"
          />
          <KpiCard
            label="Total Saiu"
            value={formatCurrency(totalDespesas)}
            className="text-red-500"
          />
          <KpiCard
            label="Saldo Acumulado"
            value={formatCurrency(saldoTotal)}
            className={saldoTotal >= 0 ? "text-emerald-600" : "text-red-500"}
          />
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Tendência 3m</p>
            <div className="flex items-center gap-1.5 mt-1">
              <TrendIcon className={`h-4 w-4 ${trendColor}`} />
              <span className={`text-lg font-bold tabular-nums ${trendColor}`}>
                {Math.abs(trendPercent).toFixed(0)}%
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Média: {formatCurrency(avgLast3)}/mês
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-72 md:h-80 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
              barCategoryGap="20%"
            >
              <defs>
                <linearGradient id="gradientPositive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradientNegative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.02} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="gradientSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted/30"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                tickFormatter={formatCompact}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                className="text-muted-foreground"
                width={45}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted)/0.15)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-popover border border-border rounded-xl p-3.5 shadow-xl min-w-[220px] backdrop-blur-sm">
                      <p className="font-semibold text-sm capitalize mb-2.5">{d.fullName}</p>
                      <div className="space-y-2 text-xs">
                        <TooltipRow
                          dot="bg-emerald-500"
                          label="Entrou"
                          value={formatCurrency(d.receitas)}
                        />
                        <TooltipRow
                          dot="bg-red-500"
                          label="Saiu"
                          value={formatCurrency(d.despesas)}
                        />
                        <div className="border-t pt-2 flex justify-between items-center">
                          <span className="font-medium text-muted-foreground">Resultado</span>
                          <span
                            className={`font-bold ${d.resultado >= 0 ? "text-emerald-600" : "text-red-500"}`}
                          >
                            {formatCurrency(d.resultado)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-muted-foreground">Saldo Acum.</span>
                          <span
                            className={`font-semibold ${d.saldoAcumulado >= 0 ? "text-emerald-600" : "text-red-500"}`}
                          >
                            {formatCurrency(d.saldoAcumulado)}
                          </span>
                        </div>
                        {d.isFuture && (
                          <p className="text-[10px] text-muted-foreground italic mt-1">
                            * Projeção futura
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />

              {/* Area for accumulated balance */}
              <Area
                type="monotone"
                dataKey="saldoAcumulado"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="url(#gradientSaldo)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: "hsl(var(--primary))",
                  stroke: "hsl(var(--background))",
                  strokeWidth: 2,
                }}
              />

              {/* Revenue bars */}
              <Bar
                dataKey="receitas"
                fill="#10b981"
                radius={[3, 3, 0, 0]}
                maxBarSize={22}
                opacity={0.75}
              />

              {/* Expense bars */}
              <Bar
                dataKey="despesas"
                fill="#ef4444"
                radius={[3, 3, 0, 0]}
                maxBarSize={22}
                opacity={0.55}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 opacity-75" />
            Entrou
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-red-500 opacity-55" />
            Saiu
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-sm bg-primary/20 border border-primary/40" />
            Saldo Acumulado
          </span>
        </div>

        {/* Best / Worst chips */}
        {(bestMonth || worstMonth) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {bestMonth && (
              <span className="inline-flex items-center gap-1.5 text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full px-3 py-1 font-medium">
                <TrendingUp className="h-3 w-3" />
                Melhor: {bestMonth.fullName} ({formatCurrency(bestMonth.resultado)})
              </span>
            )}
            {worstMonth && worstMonth !== bestMonth && (
              <span className="inline-flex items-center gap-1.5 text-[11px] bg-red-500/10 text-red-500 dark:text-red-400 rounded-full px-3 py-1 font-medium">
                <TrendingDown className="h-3 w-3" />
                Pior: {worstMonth.fullName} ({formatCurrency(worstMonth.resultado)})
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KpiCard({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className={`text-lg font-bold tabular-nums mt-1 ${className ?? ""}`}>{value}</p>
    </div>
  );
}

function TooltipRow({
  dot,
  label,
  value,
}: {
  dot: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <span className="text-muted-foreground">{label}</span>
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
