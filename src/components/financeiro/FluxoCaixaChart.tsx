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
  Line,
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
  isSameMonth,
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
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const totalDaysInMonth = Math.ceil((currentMonthEnd.getTime() - currentMonthStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysElapsed = Math.ceil((now.getTime() - currentMonthStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysLeft = totalDaysInMonth - daysElapsed;
    const showProjection = daysLeft <= 5;

    let earliest: Date | null = null;
    pagamentos.forEach((pag) => {
      pag.parcelas.forEach((p) => {
        if (!p.data_pagamento) return;
        try {
          const d = parseISO(p.data_pagamento);
          if (!earliest || d < earliest) earliest = d;
        } catch { /* skip */ }
      });
    });
    despesas.forEach((d) => {
      try {
        const dd = parseISO(d.data_vencimento);
        if (!earliest || dd < earliest) earliest = dd;
      } catch { /* skip */ }
    });

    const startDate = startOfMonth(earliest || subMonths(now, 11));
    // Only show future months if ≤5 days left in current month
    const endDate = showProjection ? endOfMonth(addMonths(now, 3)) : currentMonthEnd;
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    let saldoAcumulado = 0;

    const data = months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const isFuture = isAfter(monthStart, currentMonthStart) && !isSameMonth(month, now);

      let receitas = 0;
      pagamentos.forEach((pag) => {
        pag.parcelas.forEach((p) => {
          if (!p.data_pagamento || p.status === "inadimplente") return;
          try {
            const parcelaDate = parseISO(p.data_pagamento);
            if (parcelaDate >= monthStart && parcelaDate <= monthEnd) {
              receitas += p.valor || 0;
            }
          } catch { /* skip */ }
        });
      });

      let despesasTotal = 0;
      despesas.forEach((d) => {
        try {
          const despesaDate = parseISO(d.data_vencimento);
          if (despesaDate >= monthStart && despesaDate <= monthEnd) {
            despesasTotal += d.valor;
          }
        } catch { /* skip */ }
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
        // Split data for past/future area rendering
        saldoPast: isFuture ? undefined : saldoAcumulado,
        saldoFuture: undefined as number | undefined,
      };
    });

    // Calculate MoM % variation on monthly resultado (receitas - despesas)
    // and cumulative growth from the first month with activity
    const firstActiveIdx = data.findIndex((d) => d.receitas > 0 || d.despesas > 0);
    const firstResultado = firstActiveIdx >= 0 ? data[firstActiveIdx].resultado : 0;

    const dataWithVariation = data.map((item, i) => {
      // MoM variation: how the monthly resultado changed vs previous month
      let variacao: number | undefined;
      if (i > 0 && (data[i - 1].receitas > 0 || data[i - 1].despesas > 0)) {
        const prev = data[i - 1].resultado;
        if (prev !== 0) {
          variacao = ((item.resultado - prev) / Math.abs(prev)) * 100;
        } else if (item.resultado !== 0) {
          variacao = 100; // went from 0 to something
        }
      }

      // Cumulative growth from first active month
      let crescimentoTotal: number | undefined;
      if (i > firstActiveIdx && firstActiveIdx >= 0 && firstResultado !== 0) {
        crescimentoTotal = ((item.resultado - firstResultado) / Math.abs(firstResultado)) * 100;
      }

      // For future months, set saldoFuture; also include last past month to connect the line
      const isLastPast = !item.isFuture && i + 1 < data.length && data[i + 1]?.isFuture;
      return {
        ...item,
        variacao,
        crescimentoTotal,
        saldoFuture: item.isFuture || isLastPast ? item.saldoAcumulado : undefined,
        saldoPast: item.isFuture ? undefined : item.saldoAcumulado,
      };
    });

    // Stats — only past data (current month + before)
    const pastData = dataWithVariation.filter((d) => !d.isFuture);
    const active = pastData.filter((d) => d.receitas > 0 || d.despesas > 0);
    let best = active[0] || null;
    let worst = active[0] || null;
    active.forEach((d) => {
      if (d.resultado > (best?.resultado ?? -Infinity)) best = d;
      if (d.resultado < (worst?.resultado ?? Infinity)) worst = d;
    });

    const totalReceitas = pastData.reduce((a, d) => a + d.receitas, 0);
    const totalDespesas = pastData.reduce((a, d) => a + d.despesas, 0);

    // Current month projection
    const currentMonthFullName = format(now, "MMMM/yyyy", { locale: ptBR });
    const currentMonthData = pastData.find((d) => d.fullName === currentMonthFullName);
    const receitaAtual = currentMonthData?.receitas ?? 0;
    const despesaAtual = currentMonthData?.despesas ?? 0;
    const projectionFactor = daysElapsed > 0 ? totalDaysInMonth / daysElapsed : 1;
    const receitaProjetada = receitaAtual * projectionFactor;
    const despesaProjetada = despesaAtual * projectionFactor;
    const resultadoProjetado = receitaProjetada - despesaProjetada;

    // Previous month for comparison
    const prevMonthDate = subMonths(now, 1);
    const prevMonthName = format(prevMonthDate, "MMMM/yyyy", { locale: ptBR });
    const prevMonthData = pastData.find((d) => d.fullName === prevMonthName);
    const resultadoMesAnterior = prevMonthData?.resultado ?? 0;
    const projecaoVsPrev = resultadoMesAnterior !== 0
      ? ((resultadoProjetado - resultadoMesAnterior) / Math.abs(resultadoMesAnterior)) * 100
      : resultadoProjetado !== 0 ? 100 : 0;

    // Trend: last 3 PAST months vs previous 3
    const last3 = pastData.slice(-3);
    const avgLast3 = last3.length > 0 ? last3.reduce((a, d) => a + d.resultado, 0) / last3.length : 0;
    const prev3 = pastData.slice(-6, -3);
    const avgPrev3 = prev3.length > 0 ? prev3.reduce((a, d) => a + d.resultado, 0) / prev3.length : 0;
    const trendPercent = avgPrev3 !== 0 ? ((avgLast3 - avgPrev3) / Math.abs(avgPrev3)) * 100 : 0;

    return {
      chartData: dataWithVariation,
      totalReceitas,
      totalDespesas,
      saldoTotal: totalReceitas - totalDespesas,
      bestMonth: best,
      worstMonth: worst,
      trendPercent,
      avgLast3,
      currentMonthName: format(now, "MMMM", { locale: ptBR }),
      daysElapsed,
      daysLeft,
      receitaAtual,
      despesaAtual,
      receitaProjetada,
      despesaProjetada,
      resultadoProjetado,
      projecaoVsPrev,
    };
  }, [pagamentos, despesas]);
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(value);

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
    currentMonthName,
    daysElapsed,
    daysLeft,
    receitaAtual,
    despesaAtual,
    receitaProjetada,
    despesaProjetada,
    resultadoProjetado,
    projecaoVsPrev,
  } = useChartData(pagamentos, despesas);

  const TrendIcon = trendPercent > 0 ? ArrowUpRight : trendPercent < 0 ? ArrowDownRight : Minus;
  const trendColor = trendPercent > 0
    ? "text-primary"
    : trendPercent < 0
      ? "text-destructive"
      : "text-muted-foreground";

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
          <KpiCard label="Total Entrou" value={formatCurrency(totalReceitas)} accent="primary" />
          <KpiCard label="Total Saiu" value={formatCurrency(totalDespesas)} accent="destructive" />
          <KpiCard
            label="Saldo Acumulado"
            value={formatCurrency(saldoTotal)}
            accent={saldoTotal >= 0 ? "primary" : "destructive"}
          />
          <div className="rounded-lg border bg-card p-3">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
              Tendência 3m
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <TrendIcon className={`h-4 w-4 ${trendColor}`} />
              <span className={`text-sm font-bold ${trendColor}`}>
                {trendPercent > 0 ? "Crescendo" : trendPercent < 0 ? "Caindo" : "Estável"}
              </span>
            </div>
            <p className={`text-xs font-semibold tabular-nums mt-0.5 ${trendColor}`}>
              {formatCurrency(Math.abs(avgLast3))}/mês
            </p>
            {trendPercent !== 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {Math.abs(trendPercent).toFixed(0)}% vs trimestre anterior
              </p>
            )}
          </div>
        </div>

        {/* Projeção do mês atual */}
        <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold capitalize">
                Projeção {currentMonthName}
              </p>
            </div>
            <span className="text-[10px] uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-semibold">
              {daysElapsed} dias passados · {daysLeft} restantes
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Entrou até agora</p>
              <p className="text-sm font-bold tabular-nums text-primary">{formatCurrency(receitaAtual)}</p>
              <p className="text-[10px] text-muted-foreground">→ proj: {formatCurrency(receitaProjetada)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Saiu até agora</p>
              <p className="text-sm font-bold tabular-nums text-destructive">{formatCurrency(despesaAtual)}</p>
              <p className="text-[10px] text-muted-foreground">→ proj: {formatCurrency(despesaProjetada)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Resultado projetado</p>
              <p className={`text-sm font-bold tabular-nums ${resultadoProjetado >= 0 ? "text-primary" : "text-destructive"}`}>
                {formatCurrency(resultadoProjetado)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                se manter o ritmo
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">vs mês anterior</p>
              <div className="flex items-center gap-1 mt-0.5">
                {projecaoVsPrev >= 0 ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
                )}
                <p className={`text-sm font-bold tabular-nums ${projecaoVsPrev >= 0 ? "text-primary" : "text-destructive"}`}>
                  {projecaoVsPrev >= 0 ? "+" : ""}{projecaoVsPrev.toFixed(0)}%
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground">
                na projeção
              </p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-72 md:h-80 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
              barCategoryGap="20%"
            >
              <defs>
                <linearGradient id="gradSaldoPast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="gradSaldoFuture" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
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
                      <div className="flex items-center gap-2 mb-2.5">
                        <p className="font-semibold text-sm capitalize">{d.fullName}</p>
                        {d.isFuture && (
                          <span className="text-[9px] uppercase tracking-wider bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-semibold">
                            Projeção
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 text-xs">
                        <TooltipRow dot="bg-primary" label="Entrou" value={formatCurrency(d.receitas)} />
                        <TooltipRow dot="bg-destructive" label="Saiu" value={formatCurrency(d.despesas)} />
                        <div className="border-t pt-2 flex justify-between items-center">
                          <span className="font-medium text-muted-foreground">Resultado</span>
                          <span className={`font-bold ${d.resultado >= 0 ? "text-primary" : "text-destructive"}`}>
                            {formatCurrency(d.resultado)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-muted-foreground">Saldo Acum.</span>
                          <span className={`font-semibold ${d.saldoAcumulado >= 0 ? "text-primary" : "text-destructive"}`}>
                            {formatCurrency(d.saldoAcumulado)}
                          </span>
                        </div>
                        {d.variacao !== undefined && (
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-muted-foreground">vs mês anterior</span>
                            <span className={`font-semibold ${d.variacao >= 0 ? "text-primary" : "text-destructive"}`}>
                              {d.variacao >= 0 ? "+" : ""}{d.variacao.toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {d.crescimentoTotal !== undefined && (
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-muted-foreground">vs 1º mês</span>
                            <span className={`font-semibold ${d.crescimentoTotal >= 0 ? "text-primary" : "text-destructive"}`}>
                              {d.crescimentoTotal >= 0 ? "+" : ""}{d.crescimentoTotal.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />

              {/* Past saldo area — solid with MoM % labels */}
              <Area
                type="monotone"
                dataKey="saldoPast"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="url(#gradSaldoPast)"
                dot={(props: any) => {
                  const { cx, cy, payload, index } = props;
                  if (!cx || !cy) return <g key={props.key} />;
                  const pct = payload.variacao;
                  // Skip first month (no variation) and months with no activity
                  if (pct === undefined || index === 0) {
                    return <circle key={props.key} cx={cx} cy={cy} r={3} fill="hsl(var(--primary))" />;
                  }
                  const label = `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
                  const color = pct >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))";
                  return (
                    <g key={props.key}>
                      <circle cx={cx} cy={cy} r={3.5} fill={color} />
                      <text
                        x={cx}
                        y={cy - 12}
                        textAnchor="middle"
                        fill={color}
                        fontSize={9}
                        fontWeight="700"
                      >
                        {label}
                      </text>
                    </g>
                  );
                }}
                activeDot={{ r: 5, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
                connectNulls={false}
              />

              {/* Future saldo area — dashed projection */}
              <Area
                type="monotone"
                dataKey="saldoFuture"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="6 4"
                fill="url(#gradSaldoFuture)"
                connectNulls={false}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (!cx || !cy || !payload.isFuture) return <g key={props.key} />;
                  const pct = payload.variacao;
                  if (pct === undefined) return <g key={props.key} />;
                  const label = `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
                  return (
                    <g key={props.key}>
                      <circle cx={cx} cy={cy} r={3} fill="hsl(var(--muted-foreground))" />
                      <text
                        x={cx}
                        y={cy - 12}
                        textAnchor="middle"
                        fill="hsl(var(--muted-foreground))"
                        fontSize={10}
                        fontWeight="600"
                      >
                        {label}
                      </text>
                    </g>
                  );
                }}
                activeDot={{ r: 4, fill: "hsl(var(--muted-foreground))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
              />

              {/* Revenue bars */}
              <Bar
                dataKey="receitas"
                fill="hsl(var(--primary))"
                radius={[3, 3, 0, 0]}
                maxBarSize={22}
                opacity={0.7}
              />

              {/* Expense bars */}
              <Bar
                dataKey="despesas"
                fill="hsl(var(--destructive))"
                radius={[3, 3, 0, 0]}
                maxBarSize={22}
                opacity={0.5}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary opacity-70" />
            Entrou
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-destructive opacity-50" />
            Saiu
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-sm bg-primary/20 border border-primary/40" />
            Saldo Realizado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-sm bg-muted-foreground/10 border border-muted-foreground/30 border-dashed" />
            Projeção
          </span>
        </div>

        {/* Best / Worst chips */}
        {(bestMonth || worstMonth) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {bestMonth && (
              <span className="inline-flex items-center gap-1.5 text-[11px] bg-primary/10 text-primary rounded-full px-3 py-1 font-medium">
                <TrendingUp className="h-3 w-3" />
                Melhor: {bestMonth.fullName} ({formatCurrency(bestMonth.resultado)})
              </span>
            )}
            {worstMonth && worstMonth !== bestMonth && (
              <span className="inline-flex items-center gap-1.5 text-[11px] bg-destructive/10 text-destructive rounded-full px-3 py-1 font-medium">
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

function KpiCard({ label, value, accent }: { label: string; value: string; accent: "primary" | "destructive" }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold tabular-nums mt-1 ${accent === "primary" ? "text-primary" : "text-destructive"}`}>
        {value}
      </p>
    </div>
  );
}

function TooltipRow({ dot, label, value }: { dot: string; label: string; value: string }) {
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
