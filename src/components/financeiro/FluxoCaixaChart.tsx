import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, addMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp } from "lucide-react";
import type { PagamentoComMae } from "@/hooks/usePagamentos";
import type { Despesa } from "@/types/despesa";

interface FluxoCaixaChartProps {
  pagamentos: PagamentoComMae[];
  despesas: Despesa[];
}

export function FluxoCaixaChart({ pagamentos, despesas }: FluxoCaixaChartProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    const startDate = startOfMonth(subMonths(now, 5));
    const endDate = endOfMonth(addMonths(now, 6));
    
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    const raw = months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const isCurrentMonth = format(month, "MM/yyyy") === format(now, "MM/yyyy");
      
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
        saldo: resultado,
        resultado,
        isCurrentMonth,
        mediaMovel3: 0,
      };
    });

    // Compute 3-month moving average of resultado
    return raw.map((item, i) => {
      if (i >= 2) {
        item.mediaMovel3 = (raw[i].resultado + raw[i - 1].resultado + raw[i - 2].resultado) / 3;
      } else if (i === 1) {
        item.mediaMovel3 = (raw[i].resultado + raw[i - 1].resultado) / 2;
      } else {
        item.mediaMovel3 = raw[i].resultado;
      }
      return item;
    });
  }, [pagamentos, despesas]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatCompact = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toString();
  };

  const totalReceitas = chartData.reduce((acc, d) => acc + d.receitas, 0);
  const totalDespesas = chartData.reduce((acc, d) => acc + d.despesas, 0);
  const saldoTotal = totalReceitas - totalDespesas;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Fluxo de Caixa (12 meses)
          </CardTitle>
          <div className={`text-sm font-semibold ${saldoTotal >= 0 ? 'text-primary' : 'text-destructive'}`}>
            Saldo: {formatCurrency(saldoTotal)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
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
                  return (
                    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-[180px]">
                      <p className="font-semibold text-sm mb-2 capitalize">{data.fullName}</p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-primary font-medium">Receitas:</span>
                          <span className="font-semibold">{formatCurrency(data.receitas)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-destructive font-medium">Despesas:</span>
                          <span className="font-semibold">{formatCurrency(data.despesas)}</span>
                        </div>
                        <div className="border-t pt-1.5 flex justify-between">
                          <span className="font-medium">Saldo:</span>
                          <span className={`font-bold ${data.saldo >= 0 ? 'text-primary' : 'text-destructive'}`}>
                            {formatCurrency(data.saldo)}
                          </span>
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
                    {value === "receitas" ? "Receitas" : "Despesas"}
                  </span>
                )}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Bar 
                dataKey="receitas" 
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                maxBarSize={35}
              />
              <Bar 
                dataKey="despesas" 
                fill="hsl(var(--destructive))"
                radius={[4, 4, 0, 0]}
                maxBarSize={35}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Receitas</p>
            <p className="text-sm font-semibold text-primary">{formatCurrency(totalReceitas)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Despesas</p>
            <p className="text-sm font-semibold text-destructive">{formatCurrency(totalDespesas)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Saldo Período</p>
            <p className={`text-sm font-semibold ${saldoTotal >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {formatCurrency(saldoTotal)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
