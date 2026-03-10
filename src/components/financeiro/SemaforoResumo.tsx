import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseISO, getMonth, getYear, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { Info } from "lucide-react";
import type { PagamentoComMae } from "@/hooks/usePagamentos";
import type { Despesa } from "@/types/despesa";
import type { FilterPeriod } from "./FinanceiroFilters";
import { CATEGORIA_LABELS, type CategoriaDespesa } from "@/types/despesa";

interface SemaforoResumoProps {
  pagamentos: PagamentoComMae[];
  despesas: Despesa[];
  fornecedores: { id: string; nome: string }[];
  period: FilterPeriod;
  selectedMonth: number;
  selectedYear: number;
}

function getMonthTotals(
  pagamentos: PagamentoComMae[],
  despesas: Despesa[],
  month: number,
  year: number,
) {
  let entrou = 0;
  pagamentos.forEach((pag) => {
    pag.parcelas.forEach((p) => {
      if (!p.data_pagamento || p.status === "inadimplente") return;
      try {
        const d = parseISO(p.data_pagamento);
        if (getMonth(d) === month && getYear(d) === year) entrou += p.valor || 0;
      } catch { /* skip */ }
    });
  });

  let saiu = 0;
  const catTotals = new Map<string, number>();
  const fornTotals = new Map<string, number>();

  despesas.forEach((d) => {
    try {
      const dd = parseISO(d.data_vencimento);
      if (getMonth(dd) === month && getYear(dd) === year) {
        saiu += d.valor;
        catTotals.set(d.categoria, (catTotals.get(d.categoria) || 0) + d.valor);
        if (d.fornecedor) {
          fornTotals.set(d.fornecedor, (fornTotals.get(d.fornecedor) || 0) + d.valor);
        }
      }
    } catch { /* skip */ }
  });

  // Top categoria de despesa
  let topCat = "";
  let topCatVal = 0;
  catTotals.forEach((v, k) => { if (v > topCatVal) { topCat = k; topCatVal = v; } });

  // Top fornecedor
  let topForn = "";
  let topFornVal = 0;
  fornTotals.forEach((v, k) => { if (v > topFornVal) { topForn = k; topFornVal = v; } });

  return { entrou, saiu, sobrou: entrou - saiu, topCat, topCatVal, topForn, topFornVal };
}

export function SemaforoResumo({
  pagamentos,
  despesas,
  fornecedores,
  period,
  selectedMonth,
  selectedYear,
}: SemaforoResumoProps) {
  const data = useMemo(() => {
    const cur = getMonthTotals(pagamentos, despesas, selectedMonth, selectedYear);

    const prevDate = subMonths(new Date(selectedYear, selectedMonth, 1), 1);
    const prev = getMonthTotals(pagamentos, despesas, getMonth(prevDate), getYear(prevDate));

    // 3 months average despesas
    let despAvg3 = 0;
    for (let i = 1; i <= 3; i++) {
      const d = subMonths(new Date(selectedYear, selectedMonth, 1), i);
      const t = getMonthTotals(pagamentos, despesas, getMonth(d), getYear(d));
      despAvg3 += t.saiu;
    }
    despAvg3 /= 3;

    // Check 3-month falling trend
    let fallingStreak = 0;
    for (let i = 0; i < 3; i++) {
      const d1 = subMonths(new Date(selectedYear, selectedMonth, 1), i);
      const d2 = subMonths(new Date(selectedYear, selectedMonth, 1), i + 1);
      const t1 = getMonthTotals(pagamentos, despesas, getMonth(d1), getYear(d1));
      const t2 = getMonthTotals(pagamentos, despesas, getMonth(d2), getYear(d2));
      if (t1.sobrou < t2.sobrou) fallingStreak++;
      else break;
    }

    // Semaphore logic
    let semaphore: "green" | "yellow" | "red";
    if (cur.sobrou < 0 || fallingStreak >= 3) {
      semaphore = "red";
    } else if (cur.sobrou > 0 && cur.sobrou >= prev.sobrou) {
      semaphore = "green";
    } else {
      // sobrou > 0 but worse, or despesas above 3m avg
      semaphore = "yellow";
    }
    if (semaphore !== "red" && despAvg3 > 0 && cur.saiu > despAvg3 * 1.15) {
      semaphore = "yellow";
    }

    // Motivos
    const topMotivo = cur.topForn
      ? `maior gasto: ${cur.topForn}`
      : cur.topCat
      ? `maior categoria: ${CATEGORIA_LABELS[cur.topCat as CategoriaDespesa] || cur.topCat}`
      : "";

    return { cur, prev, semaphore, topMotivo };
  }, [pagamentos, despesas, selectedMonth, selectedYear]);

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(v);

  const fmtDelta = (cur: number, prev: number) => {
    if (prev === 0) return "";
    const pct = ((cur - prev) / Math.abs(prev)) * 100;
    return ` (${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%)`;
  };

  const semaphoreEmoji = data.semaphore === "green" ? "🟢" : data.semaphore === "yellow" ? "🟡" : "🔴";
  const semaphoreLabel = data.semaphore === "green"
    ? "Saúde financeira boa"
    : data.semaphore === "yellow"
    ? "Atenção necessária"
    : "Situação crítica";
  const semaphoreBg = data.semaphore === "green"
    ? "bg-primary/10 border-primary/30"
    : data.semaphore === "yellow"
    ? "bg-warning/10 border-warning/30"
    : "bg-destructive/10 border-destructive/30";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            O que mudou este mês
          </CardTitle>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${semaphoreBg}`}>
            <span>{semaphoreEmoji}</span>
            <span className="hidden sm:inline">{semaphoreLabel}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold text-sm mt-0.5">↗</span>
            <div>
              <p className="text-sm">
                <span className="font-medium">Entrou:</span>{" "}
                {fmtCurrency(data.cur.entrou)}
                <span className="text-muted-foreground text-xs">{fmtDelta(data.cur.entrou, data.prev.entrou)}</span>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-destructive font-bold text-sm mt-0.5">↘</span>
            <div>
              <p className="text-sm">
                <span className="font-medium">Saiu:</span>{" "}
                {fmtCurrency(data.cur.saiu)}
                <span className="text-muted-foreground text-xs">{fmtDelta(data.cur.saiu, data.prev.saiu)}</span>
                {data.topMotivo && (
                  <span className="text-muted-foreground text-xs ml-1">— {data.topMotivo}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className={`font-bold text-sm mt-0.5 ${data.cur.sobrou >= 0 ? "text-primary" : "text-destructive"}`}>
              {data.cur.sobrou >= 0 ? "✓" : "✗"}
            </span>
            <div>
              <p className="text-sm">
                <span className="font-medium">Sobrou:</span>{" "}
                <span className={data.cur.sobrou >= 0 ? "text-primary" : "text-destructive"}>
                  {fmtCurrency(data.cur.sobrou)}
                </span>
                <span className="text-muted-foreground text-xs">{fmtDelta(data.cur.sobrou, data.prev.sobrou)}</span>
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
