import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell, Label } from "recharts";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, addMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, Award, AlertOctagon } from "lucide-react";
import type { PagamentoComMae } from "@/hooks/usePagamentos";
import type { Despesa } from "@/types/despesa";

interface FluxoCaixaChartProps {
  pagamentos: PagamentoComMae[];
  despesas: Despesa[];
}

export function FluxoCaixaChart({ pagamentos, despesas }: FluxoCaixaChartProps) {
  const { chartData, bestMonth, worstMonth } = useMemo(() => {
    const now = new Date();
    
    // Find earliest activity date
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
    const endDate = endOfMonth(now);
    
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    const raw = months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
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
      return {
        name: format(month, "MMM", { locale: ptBR }),
        fullName: format(month, "MMMM/yyyy", { locale: ptBR }),
        receitas,
        despesas: despesasTotal,
        resultado,
        mediaMovel3: 0,
        highlight: "" as "" | "best" | "worst",
      };
    });

    // Moving average
    const data = raw.map((item, i) => {
      if (i >= 2) {
        item.mediaMovel3 = (raw[i].resultado + raw[i - 1].resultado + raw[i - 2].resultado) / 3;
      } else if (i === 1) {
        item.mediaMovel3 = (raw[i].resultado + raw[i - 1].resultado) / 2;
      } else {
        item.mediaMovel3 = raw[i].resultado;
      }
      return item;
    });

    // Find best/worst months (only months with any activity)
    const active = data.filter((d) => d.receitas > 0 || d.despesas > 0);
    let best = active[0] || null;
    let worst = active[0] || null;
    active.forEach((d) => {
      if (d.resultado > (best?.resultado ?? -Infinity)) best = d;
      if (d.resultado < (worst?.resultado ?? Infinity)) worst = d;
    });

    // Mark highlights on data
    if (best) best.highlight = "best";
    if (worst && worst !== best) worst.highlight = "worst";

    return { chartData: data, bestMonth: best, worstMonth: worst };
  }, [pagamentos, despesas]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(value);

  const formatCompact = (value: number) => {
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toString();
  };

  const totalReceitas = chartData.reduce((acc, d) => acc + d.receitas, 0);
  const totalDespesas = chartData.reduce((acc, d) => acc + d.despesas, 0);
  const saldoTotal = totalReceitas - totalDespesas;

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Entrou x Saiu (12 meses)
          </CardTitle>
          <div className={`text-sm font-semibold ${saldoTotal >= 0 ? 'text-primary' : 'text-destructive'}`}>
            Sobrou: {formatCurrency(saldoTotal)}
          </div>
        </div>
        {/* Best / Worst month badges */}
        {(bestMonth || worstMonth) && (
          <div className="flex flex-wrap gap-2 mt-1">
            {bestMonth && (
              <span className="inline-flex items-center gap-1 text-[10px] md:text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">
                <Award className="h-3 w-3" />
                Melhor: {bestMonth.fullName} ({formatCurrency(bestMonth.resultado)})
              </span>
            )}
            {worstMonth && worstMonth !== bestMonth && (
              <span className="inline-flex items-center gap-1 text-[10px] md:text-xs bg-destructive/10 text-destructive rounded-full px-2 py-0.5 font-medium">
                <AlertOctagon className="h-3 w-3" />
                Pior: {worstMonth.fullName} ({formatCurrency(worstMonth.resultado)})
              </span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-72 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={chartData} 
              margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
              barCategoryGap="15%"
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
                tickFormatter={formatCompact}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                className="text-muted-foreground"
                width={45}
              />
              <Tooltip 
                cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  const isBest = bestMonth && data.name === bestMonth.name;
                  const isWorst = worstMonth && data.name === worstMonth.name && worstMonth !== bestMonth;
                  return (
                    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-[200px]">
                      <p className="font-semibold text-sm mb-2 capitalize">
                        {data.fullName}
                        {isBest && <span className="ml-1 text-primary">⭐ melhor</span>}
                        {isWorst && <span className="ml-1 text-destructive">⚠ pior</span>}
                      </p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-primary font-medium">Entrou:</span>
                          <span className="font-semibold">{formatCurrency(data.receitas)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-destructive font-medium">Saiu:</span>
                          <span className="font-semibold">{formatCurrency(data.despesas)}</span>
                        </div>
                        <div className="border-t pt-1.5 flex justify-between">
                          <span className="font-medium">Sobrou:</span>
                          <span className={`font-bold ${data.resultado >= 0 ? 'text-primary' : 'text-destructive'}`}>
                            {formatCurrency(data.resultado)}
                          </span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Tendência (3m):</span>
                          <span className="font-medium">{formatCurrency(data.mediaMovel3)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => (
                  <span className="text-xs font-medium">
                    {value === "receitas" ? "Entrou" : value === "despesas" ? "Saiu" : value === "resultado" ? "Sobrou no mês" : "Tendência (3m)"}
                  </span>
                )}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Bar 
                dataKey="receitas" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              />
              <Bar 
                dataKey="despesas" 
                fill="hsl(var(--destructive))"
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              />
              <Line
                type="monotone"
                dataKey="resultado"
                stroke="hsl(var(--accent-foreground))"
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (!cx || !cy) return <circle key={props.key} />;
                  if (payload.highlight === "best") {
                    return (
                      <g key={props.key}>
                        <circle cx={cx} cy={cy} r={8} fill="#10b981" opacity={0.25} />
                        <circle cx={cx} cy={cy} r={5} fill="#10b981" stroke="white" strokeWidth={2} />
                        <text x={cx} y={cy - 14} textAnchor="middle" fill="#10b981" fontSize={10} fontWeight="bold">⭐</text>
                      </g>
                    );
                  }
                  if (payload.highlight === "worst") {
                    return (
                      <g key={props.key}>
                        <circle cx={cx} cy={cy} r={8} fill="#f59e0b" opacity={0.25} />
                        <circle cx={cx} cy={cy} r={5} fill="#f59e0b" stroke="white" strokeWidth={2} />
                        <text x={cx} y={cy - 14} textAnchor="middle" fill="#f59e0b" fontSize={10} fontWeight="bold">⚠</text>
                      </g>
                    );
                  }
                  return <circle key={props.key} cx={cx} cy={cy} r={3} fill="hsl(var(--accent-foreground))" />;
                }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="mediaMovel3"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Entrou</p>
            <p className="text-sm font-semibold text-primary">{formatCurrency(totalReceitas)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Saiu</p>
            <p className="text-sm font-semibold text-destructive">{formatCurrency(totalDespesas)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Sobrou no Período</p>
            <p className={`text-sm font-semibold ${saldoTotal >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(saldoTotal)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
