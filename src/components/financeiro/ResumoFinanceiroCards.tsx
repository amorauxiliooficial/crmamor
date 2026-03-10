import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle2, Clock, ArrowUp, ArrowDown } from "lucide-react";
import type { PagamentoComMae } from "@/hooks/usePagamentos";
import type { Despesa } from "@/types/despesa";
import type { FilterPeriod } from "./FinanceiroFilters";
import { parseISO, getMonth, getYear, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";

interface ResumoFinanceiroCardsProps {
  pagamentos: PagamentoComMae[];
  despesas: Despesa[];
  period: FilterPeriod;
  selectedMonth: number;
  selectedYear: number;
}

function calcPeriodTotals(
  pagamentos: PagamentoComMae[],
  despesas: Despesa[],
  period: FilterPeriod,
  selectedMonth: number,
  selectedYear: number,
) {
  const isInPeriod = (dateStr: string | null): boolean => {
    if (!dateStr) return false;
    if (period === "total") return true;
    try {
      const date = parseISO(dateStr);
      const y = getYear(date);
      const m = getMonth(date);
      if (period === "ano") return y === selectedYear;
      return y === selectedYear && m === selectedMonth;
    } catch { return false; }
  };

  let receitasRecebidas = 0;
  let receitasPendentes = 0;
  let receitasInadimplentes = 0;

  pagamentos.forEach((pag) => {
    pag.parcelas.forEach((p) => {
      if (!isInPeriod(p.data_pagamento)) return;
      const valor = p.valor || 0;
      if (p.status === "pago") receitasRecebidas += valor;
      else if (p.status === "pendente") receitasPendentes += valor;
      else if (p.status === "inadimplente") receitasInadimplentes += valor;
    });
  });

  let despesasPagas = 0;
  let despesasPendentes = 0;

  despesas.forEach((d) => {
    if (!isInPeriod(d.data_vencimento)) return;
    if (d.status === "pago") despesasPagas += d.valor;
    else if (d.status === "pendente" || d.status === "atrasado") despesasPendentes += d.valor;
  });

  return {
    receitasRecebidas,
    receitasPendentes,
    receitasInadimplentes,
    despesasPagas,
    despesasPendentes,
    saldoRecebido: receitasRecebidas - despesasPagas,
    saldoPrevisto: (receitasRecebidas + receitasPendentes + receitasInadimplentes) - (despesasPagas + despesasPendentes),
  };
}

function fmtDelta(cur: number, prev: number): { label: string; pct: number | null; isPositive: boolean } {
  const diff = cur - prev;
  const pct = prev !== 0 ? ((cur - prev) / Math.abs(prev)) * 100 : null;
  return {
    label: pct !== null
      ? `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`
      : diff !== 0 ? (diff > 0 ? "↑" : "↓") : "=",
    pct,
    isPositive: diff >= 0,
  };
}

export function ResumoFinanceiroCards({
  pagamentos,
  despesas,
  period,
  selectedMonth,
  selectedYear,
}: ResumoFinanceiroCardsProps) {
  const { stats, prevStats } = useMemo(() => {
    const s = calcPeriodTotals(pagamentos, despesas, period, selectedMonth, selectedYear);

    // Previous period for comparison
    let prevMonth = selectedMonth;
    let prevYear = selectedYear;
    if (period === "mes") {
      const d = subMonths(new Date(selectedYear, selectedMonth, 1), 1);
      prevMonth = getMonth(d);
      prevYear = getYear(d);
    } else if (period === "ano") {
      prevYear = selectedYear - 1;
    }

    const ps = period === "total"
      ? null
      : calcPeriodTotals(pagamentos, despesas, period, prevMonth, prevYear);

    return { stats: s, prevStats: ps };
  }, [pagamentos, despesas, period, selectedMonth, selectedYear]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatCompact = (value: number) => {
    const abs = Math.abs(value);
    if (abs >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toFixed(0);
  };

  const renderDelta = (current: number, previous: number | undefined, invertColor?: boolean) => {
    if (previous === undefined) return null;
    const { label, pct, isPositive } = fmtDelta(current, previous);
    const positive = invertColor ? !isPositive : isPositive;
    const colorClass = positive ? "text-primary" : "text-destructive";
    const diff = current - previous;

    return (
      <p className={`text-[9px] md:text-[10px] font-medium ${colorClass} truncate`}>
        {label} vs anterior
        {Math.abs(diff) > 0 && (
          <span className="text-muted-foreground font-normal ml-0.5">
            ({diff >= 0 ? "+" : ""}{formatCompact(diff)})
          </span>
        )}
      </p>
    );
  };

  const cards = [
    {
      title: "Entrou no caixa",
      value: stats.receitasRecebidas,
      prev: prevStats?.receitasRecebidas,
      icon: CheckCircle2,
      borderColor: "border-l-primary",
      valueColor: "text-primary",
      iconColor: "text-primary",
      sub: "Receitas recebidas",
    },
    {
      title: "Falta entrar",
      value: stats.receitasPendentes,
      prev: prevStats?.receitasPendentes,
      icon: Clock,
      borderColor: "border-l-warning",
      valueColor: "text-warning",
      iconColor: "text-warning",
      sub: "Pendente",
    },
    {
      title: "Saiu do caixa",
      value: stats.despesasPagas,
      prev: prevStats?.despesasPagas,
      icon: TrendingDown,
      borderColor: "border-l-destructive",
      valueColor: "text-destructive",
      iconColor: "text-destructive",
      sub: "Despesas pagas",
      invertColor: true,
    },
    {
      title: "Falta pagar",
      value: stats.despesasPendentes,
      prev: prevStats?.despesasPendentes,
      icon: AlertTriangle,
      borderColor: "",
      valueColor: "",
      iconColor: "text-muted-foreground",
      sub: "Pendente",
      invertColor: true,
    },
    {
      title: "Quanto sobrou",
      value: stats.saldoRecebido,
      prev: prevStats?.saldoRecebido,
      icon: DollarSign,
      borderColor: stats.saldoRecebido >= 0 ? "border-l-primary" : "border-l-destructive",
      valueColor: stats.saldoRecebido >= 0 ? "text-primary" : "text-destructive",
      iconColor: stats.saldoRecebido >= 0 ? "text-primary" : "text-destructive",
      sub: "Recebido − Pago",
    },
    {
      title: "Quanto deve sobrar",
      value: stats.saldoPrevisto,
      prev: prevStats?.saldoPrevisto,
      icon: TrendingUp,
      borderColor: stats.saldoPrevisto >= 0 ? "border-l-primary/50" : "border-l-destructive/50",
      valueColor: stats.saldoPrevisto >= 0 ? "text-primary/80" : "text-destructive/80",
      iconColor: stats.saldoPrevisto >= 0 ? "text-primary/70" : "text-destructive/70",
      sub: "Com pendências",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6 md:gap-4">
      {cards.map((c) => (
        <Card key={c.title} className={`${c.borderColor ? `border-l-4 ${c.borderColor}` : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:pt-4 md:px-4">
            <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground">
              {c.title}
            </CardTitle>
            <c.icon className={`h-3.5 w-3.5 md:h-4 md:w-4 ${c.iconColor}`} />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:px-4 md:pb-4">
            <div className={`text-base md:text-xl font-bold ${c.valueColor}`}>
              {formatCurrency(c.value)}
            </div>
            <p className="text-[9px] md:text-xs text-muted-foreground">{c.sub}</p>
            {renderDelta(c.value, c.prev, c.invertColor)}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
