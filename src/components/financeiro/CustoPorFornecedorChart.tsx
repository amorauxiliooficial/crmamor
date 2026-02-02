import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Despesa } from "@/types/despesa";
import type { Fornecedor } from "@/types/fornecedor";

interface CustoPorFornecedorChartProps {
  despesas: Despesa[];
  fornecedores: Fornecedor[];
}

const COLORS = [
  "bg-primary",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
  "bg-destructive",
];

export function CustoPorFornecedorChart({ despesas, fornecedores }: CustoPorFornecedorChartProps) {
  const chartData = useMemo(() => {
    const custosPorFornecedor: Record<string, { nome: string; total: number; pago: number; pendente: number }> = {};

    despesas.forEach((d) => {
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

    return Object.values(custosPorFornecedor)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [despesas, fornecedores]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const totalGeral = chartData.reduce((acc, d) => acc + d.total, 0);
  const maxValue = chartData.length > 0 ? chartData[0].total : 0;

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
          <span className="text-sm font-semibold text-destructive">
            Total: {formatCurrency(totalGeral)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {chartData.map((item, index) => {
            const percentage = maxValue > 0 ? (item.total / maxValue) * 100 : 0;
            const percentOfTotal = totalGeral > 0 ? (item.total / totalGeral) * 100 : 0;
            
            return (
              <div key={item.nome} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${COLORS[index % COLORS.length]}`} />
                    <span className="text-sm font-medium truncate" title={item.nome}>
                      {item.nome}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {percentOfTotal.toFixed(0)}%
                    </span>
                    <span className="text-sm font-semibold min-w-[80px] text-right">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                </div>
                
                <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${COLORS[index % COLORS.length]}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-xs text-muted-foreground pl-4">
                  <span>
                    Pago: <span className="text-primary font-medium">{formatCurrency(item.pago)}</span>
                  </span>
                  <span>
                    Pendente: <span className="text-destructive font-medium">{formatCurrency(item.pendente)}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {fornecedores.length > 6 && (
          <p className="text-xs text-muted-foreground text-center mt-4 pt-4 border-t">
            Mostrando os 6 maiores fornecedores
          </p>
        )}
      </CardContent>
    </Card>
  );
}
