import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Building2 } from "lucide-react";
import type { Despesa } from "@/types/despesa";
import type { Fornecedor } from "@/types/fornecedor";

interface CustoPorFornecedorChartProps {
  despesas: Despesa[];
  fornecedores: Fornecedor[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--destructive))",
];

export function CustoPorFornecedorChart({ despesas, fornecedores }: CustoPorFornecedorChartProps) {
  const chartData = useMemo(() => {
    // Agrupa despesas por fornecedor
    const custosPorFornecedor: Record<string, { nome: string; total: number; pago: number; pendente: number }> = {};

    despesas.forEach((d) => {
      // Usa fornecedor_id se disponível, senão usa o campo fornecedor (texto)
      const fornecedorId = d.fornecedor_id;
      const fornecedorNome = fornecedorId 
        ? fornecedores.find((f) => f.id === fornecedorId)?.nome || "Fornecedor removido"
        : d.fornecedor || "Sem fornecedor";

      const key = fornecedorId || fornecedorNome;

      if (!custosPorFornecedor[key]) {
        custosPorFornecedor[key] = { nome: fornecedorNome, total: 0, pago: 0, pendente: 0 };
      }

      custosPorFornecedor[key].total += d.valor;
      if (d.status === "pago") {
        custosPorFornecedor[key].pago += d.valor;
      } else if (d.status === "pendente" || d.status === "atrasado") {
        custosPorFornecedor[key].pendente += d.valor;
      }
    });

    // Converte para array e ordena por total (maior para menor)
    return Object.values(custosPorFornecedor)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8); // Limita a 8 fornecedores para melhor visualização
  }, [despesas, fornecedores]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const totalGeral = chartData.reduce((acc, d) => acc + d.total, 0);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Custo por Fornecedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Nenhuma despesa cadastrada
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Custo por Fornecedor
          </CardTitle>
          <span className="text-sm font-medium text-muted-foreground">
            Total: {formatCurrency(totalGeral)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              layout="vertical"
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <XAxis 
                type="number"
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis 
                type="category"
                dataKey="nome"
                width={100}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickFormatter={(value) => value.length > 12 ? `${value.slice(0, 12)}...` : value}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), "Total"]}
                labelClassName="font-semibold"
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold text-sm mb-2">{data.nome}</p>
                      <div className="space-y-1 text-xs">
                        <p>Total: <span className="font-medium">{formatCurrency(data.total)}</span></p>
                        <p className="text-primary">Pago: {formatCurrency(data.pago)}</p>
                        <p className="text-destructive">Pendente: {formatCurrency(data.pendente)}</p>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
