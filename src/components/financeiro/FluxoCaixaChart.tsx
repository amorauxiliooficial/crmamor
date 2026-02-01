import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, addMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
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

    return months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      // Calculate receivables (parcelas pagas + previstas)
      let receitas = 0;
      let receitasPrevistas = 0;
      
      pagamentos.forEach((pag) => {
        pag.parcelas.forEach((p) => {
          if (!p.data_pagamento) return;
          try {
            const parcelaDate = parseISO(p.data_pagamento);
            if (parcelaDate >= monthStart && parcelaDate <= monthEnd) {
              const comissao = p.valor_comissao || 0;
              if (p.status === "pago") {
                receitas += comissao;
              } else {
                receitasPrevistas += comissao;
              }
            }
          } catch {
            // Skip invalid dates
          }
        });
      });

      // Calculate expenses
      let despesasPagas = 0;
      let despesasPrevistas = 0;
      
      despesas.forEach((d) => {
        try {
          const despesaDate = parseISO(d.data_vencimento);
          if (despesaDate >= monthStart && despesaDate <= monthEnd) {
            if (d.status === "pago") {
              despesasPagas += d.valor;
            } else if (d.status === "pendente") {
              despesasPrevistas += d.valor;
            }
          }
        } catch {
          // Skip invalid dates
        }
      });

      return {
        name: format(month, "MMM/yy", { locale: ptBR }),
        receitas: receitas + receitasPrevistas,
        despesas: despesasPagas + despesasPrevistas,
        saldo: (receitas + receitasPrevistas) - (despesasPagas + despesasPrevistas),
      };
    });
  }, [pagamentos, despesas]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base md:text-lg">Fluxo de Caixa (12 meses)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === "receitas" ? "Receitas" : name === "despesas" ? "Despesas" : "Saldo"
                ]}
                labelClassName="font-semibold"
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend 
                formatter={(value) => 
                  value === "receitas" ? "Receitas" : value === "despesas" ? "Despesas" : "Saldo"
                }
              />
              <Area 
                type="monotone" 
                dataKey="receitas" 
                stackId="1"
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary)/0.3)"
              />
              <Area 
                type="monotone" 
                dataKey="despesas" 
                stackId="2"
                stroke="hsl(var(--destructive))" 
                fill="hsl(var(--destructive)/0.3)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
