import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import type { PagamentoComMae } from "@/hooks/usePagamentos";
import type { Despesa } from "@/types/despesa";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";

interface ResumoFinanceiroCardsProps {
  pagamentos: PagamentoComMae[];
  despesas: Despesa[];
}

export function ResumoFinanceiroCards({ pagamentos, despesas }: ResumoFinanceiroCardsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Receitas do mês (comissões)
    let receitasMes = 0;
    let receitasPendentes = 0;
    let totalRecebido = 0;
    let totalAReceber = 0;

    pagamentos.forEach((pag) => {
      totalRecebido += pag.comissao_recebida;
      totalAReceber += pag.comissao_pendente;
      
      pag.parcelas.forEach((p) => {
        if (!p.data_pagamento) return;
        try {
          const parcelaDate = parseISO(p.data_pagamento);
          if (parcelaDate >= monthStart && parcelaDate <= monthEnd) {
            const comissao = p.valor_comissao || 0;
            if (p.status === "pago") {
              receitasMes += comissao;
            } else {
              receitasPendentes += comissao;
            }
          }
        } catch {
          // Skip
        }
      });
    });

    // Despesas do mês
    let despesasMes = 0;
    let despesasPendentes = 0;
    let totalDespesasPagas = 0;
    let totalDespesasPendentes = 0;

    despesas.forEach((d) => {
      if (d.status === "pago") {
        totalDespesasPagas += d.valor;
      } else if (d.status === "pendente" || d.status === "atrasado") {
        totalDespesasPendentes += d.valor;
      }

      try {
        const despesaDate = parseISO(d.data_vencimento);
        if (despesaDate >= monthStart && despesaDate <= monthEnd) {
          if (d.status === "pago") {
            despesasMes += d.valor;
          } else {
            despesasPendentes += d.valor;
          }
        }
      } catch {
        // Skip
      }
    });

    const saldoMes = (receitasMes + receitasPendentes) - (despesasMes + despesasPendentes);
    const saldoTotal = (totalRecebido + totalAReceber) - (totalDespesasPagas + totalDespesasPendentes);

    return {
      receitasMes,
      receitasPendentes,
      despesasMes,
      despesasPendentes,
      saldoMes,
      totalRecebido,
      totalAReceber,
      totalDespesasPagas,
      totalDespesasPendentes,
      saldoTotal,
    };
  }, [pagamentos, despesas]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6 md:gap-4">
      {/* Receitas do Mês */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:pt-4 md:px-4">
          <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground">
            Receitas (Mês)
          </CardTitle>
          <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
        </CardHeader>
        <CardContent className="p-3 pt-0 md:px-4 md:pb-4">
          <div className="text-base md:text-xl font-bold text-primary">
            {formatCurrency(stats.receitasMes)}
          </div>
          <p className="text-[9px] md:text-xs text-muted-foreground">
            +{formatCurrency(stats.receitasPendentes)} previsto
          </p>
        </CardContent>
      </Card>

      {/* Despesas do Mês */}
      <Card className="border-l-4 border-l-destructive">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:pt-4 md:px-4">
          <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground">
            Despesas (Mês)
          </CardTitle>
          <TrendingDown className="h-3.5 w-3.5 md:h-4 md:w-4 text-destructive" />
        </CardHeader>
        <CardContent className="p-3 pt-0 md:px-4 md:pb-4">
          <div className="text-base md:text-xl font-bold text-destructive">
            {formatCurrency(stats.despesasMes)}
          </div>
          <p className="text-[9px] md:text-xs text-muted-foreground">
            +{formatCurrency(stats.despesasPendentes)} pendente
          </p>
        </CardContent>
      </Card>

      {/* Saldo do Mês */}
      <Card className={`border-l-4 ${stats.saldoMes >= 0 ? 'border-l-primary' : 'border-l-destructive'}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:pt-4 md:px-4">
          <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground">
            Saldo (Mês)
          </CardTitle>
          <DollarSign className={`h-3.5 w-3.5 md:h-4 md:w-4 ${stats.saldoMes >= 0 ? 'text-primary' : 'text-destructive'}`} />
        </CardHeader>
        <CardContent className="p-3 pt-0 md:px-4 md:pb-4">
          <div className={`text-base md:text-xl font-bold ${stats.saldoMes >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {formatCurrency(stats.saldoMes)}
          </div>
          <p className="text-[9px] md:text-xs text-muted-foreground">
            Receitas - Despesas
          </p>
        </CardContent>
      </Card>

      {/* Total Recebido */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:pt-4 md:px-4">
          <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground">
            Total Recebido
          </CardTitle>
          <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
        </CardHeader>
        <CardContent className="p-3 pt-0 md:px-4 md:pb-4">
          <div className="text-base md:text-xl font-bold">
            {formatCurrency(stats.totalRecebido)}
          </div>
          <p className="text-[9px] md:text-xs text-muted-foreground">
            Histórico
          </p>
        </CardContent>
      </Card>

      {/* Total a Receber */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:pt-4 md:px-4">
          <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground">
            A Receber
          </CardTitle>
          <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-3 pt-0 md:px-4 md:pb-4">
          <div className="text-base md:text-xl font-bold">
            {formatCurrency(stats.totalAReceber)}
          </div>
          <p className="text-[9px] md:text-xs text-muted-foreground">
            Pendente
          </p>
        </CardContent>
      </Card>

      {/* Despesas Pendentes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:pt-4 md:px-4">
          <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground">
            A Pagar
          </CardTitle>
          <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-600 dark:text-amber-400" />
        </CardHeader>
        <CardContent className="p-3 pt-0 md:px-4 md:pb-4">
          <div className="text-base md:text-xl font-bold">
            {formatCurrency(stats.totalDespesasPendentes)}
          </div>
          <p className="text-[9px] md:text-xs text-muted-foreground">
            Despesas
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
