import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import type { PagamentoComMae } from "@/hooks/usePagamentos";
import type { Despesa } from "@/types/despesa";
import type { FilterPeriod } from "./FinanceiroFilters";
import { parseISO, getMonth, getYear } from "date-fns";

interface ResumoFinanceiroCardsProps {
  pagamentos: PagamentoComMae[];
  despesas: Despesa[];
  period: FilterPeriod;
  selectedMonth: number;
  selectedYear: number;
}

export function ResumoFinanceiroCards({ 
  pagamentos, 
  despesas, 
  period,
  selectedMonth,
  selectedYear,
}: ResumoFinanceiroCardsProps) {
  const stats = useMemo(() => {
    const isInPeriod = (dateStr: string | null): boolean => {
      if (!dateStr) return false;
      if (period === "total") return true;
      
      try {
        const date = parseISO(dateStr);
        const dateYear = getYear(date);
        const dateMonth = getMonth(date);
        
        if (period === "ano") {
          return dateYear === selectedYear;
        }
        // period === "mes"
        return dateYear === selectedYear && dateMonth === selectedMonth;
      } catch {
        return false;
      }
    };

    // Receitas filtradas
    let receitasRecebidas = 0;
    let receitasPendentes = 0;

    pagamentos.forEach((pag) => {
      pag.parcelas.forEach((p) => {
        if (!isInPeriod(p.data_pagamento)) return;
        
        const valor = p.valor || 0;
        if (p.status === "pago") {
          receitasRecebidas += valor;
        } else {
          receitasPendentes += valor;
        }
      });
    });

    // Despesas filtradas
    let despesasPagas = 0;
    let despesasPendentes = 0;

    despesas.forEach((d) => {
      if (!isInPeriod(d.data_vencimento)) return;
      
      if (d.status === "pago") {
        despesasPagas += d.valor;
      } else if (d.status === "pendente" || d.status === "atrasado") {
        despesasPendentes += d.valor;
      }
    });

    const saldoRecebido = receitasRecebidas - despesasPagas;
    const saldoPrevisto = (receitasRecebidas + receitasPendentes) - (despesasPagas + despesasPendentes);

    return {
      receitasRecebidas,
      receitasPendentes,
      despesasPagas,
      despesasPendentes,
      saldoRecebido,
      saldoPrevisto,
    };
  }, [pagamentos, despesas, period, selectedMonth, selectedYear]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const periodLabel = period === "mes" ? "Mês" : period === "ano" ? "Ano" : "Total";

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6 md:gap-4">
      {/* Receitas Recebidas */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:pt-4 md:px-4">
          <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground">
            Recebido
          </CardTitle>
          <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
        </CardHeader>
        <CardContent className="p-3 pt-0 md:px-4 md:pb-4">
          <div className="text-base md:text-xl font-bold text-primary">
            {formatCurrency(stats.receitasRecebidas)}
          </div>
          <p className="text-[9px] md:text-xs text-muted-foreground">
            Receitas {periodLabel.toLowerCase()}
          </p>
        </CardContent>
      </Card>

      {/* Receitas Pendentes */}
      <Card className="border-l-4 border-l-warning">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:pt-4 md:px-4">
          <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground">
            A Receber
          </CardTitle>
          <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-warning" />
        </CardHeader>
        <CardContent className="p-3 pt-0 md:px-4 md:pb-4">
          <div className="text-base md:text-xl font-bold text-warning">
            {formatCurrency(stats.receitasPendentes)}
          </div>
          <p className="text-[9px] md:text-xs text-muted-foreground">
            Pendente {periodLabel.toLowerCase()}
          </p>
        </CardContent>
      </Card>

      {/* Despesas Pagas */}
      <Card className="border-l-4 border-l-destructive">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:pt-4 md:px-4">
          <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground">
            Pago
          </CardTitle>
          <TrendingDown className="h-3.5 w-3.5 md:h-4 md:w-4 text-destructive" />
        </CardHeader>
        <CardContent className="p-3 pt-0 md:px-4 md:pb-4">
          <div className="text-base md:text-xl font-bold text-destructive">
            {formatCurrency(stats.despesasPagas)}
          </div>
          <p className="text-[9px] md:text-xs text-muted-foreground">
            Despesas {periodLabel.toLowerCase()}
          </p>
        </CardContent>
      </Card>

      {/* Despesas Pendentes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:pt-4 md:px-4">
          <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground">
            A Pagar
          </CardTitle>
          <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-3 pt-0 md:px-4 md:pb-4">
          <div className="text-base md:text-xl font-bold">
            {formatCurrency(stats.despesasPendentes)}
          </div>
          <p className="text-[9px] md:text-xs text-muted-foreground">
            Pendente {periodLabel.toLowerCase()}
          </p>
        </CardContent>
      </Card>

      {/* Saldo Atual */}
      <Card className={`border-l-4 ${stats.saldoRecebido >= 0 ? 'border-l-primary' : 'border-l-destructive'}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:pt-4 md:px-4">
          <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground">
            Saldo Atual
          </CardTitle>
          <DollarSign className={`h-3.5 w-3.5 md:h-4 md:w-4 ${stats.saldoRecebido >= 0 ? 'text-primary' : 'text-destructive'}`} />
        </CardHeader>
        <CardContent className="p-3 pt-0 md:px-4 md:pb-4">
          <div className={`text-base md:text-xl font-bold ${stats.saldoRecebido >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {formatCurrency(stats.saldoRecebido)}
          </div>
          <p className="text-[9px] md:text-xs text-muted-foreground">
            Recebido - Pago
          </p>
        </CardContent>
      </Card>

      {/* Saldo Previsto */}
      <Card className={`border-l-4 ${stats.saldoPrevisto >= 0 ? 'border-l-primary/50' : 'border-l-destructive/50'}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:pt-4 md:px-4">
          <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground">
            Saldo Previsto
          </CardTitle>
          <TrendingUp className={`h-3.5 w-3.5 md:h-4 md:w-4 ${stats.saldoPrevisto >= 0 ? 'text-primary/70' : 'text-destructive/70'}`} />
        </CardHeader>
        <CardContent className="p-3 pt-0 md:px-4 md:pb-4">
          <div className={`text-base md:text-xl font-bold ${stats.saldoPrevisto >= 0 ? 'text-primary/80' : 'text-destructive/80'}`}>
            {formatCurrency(stats.saldoPrevisto)}
          </div>
          <p className="text-[9px] md:text-xs text-muted-foreground">
            Com pendências
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
