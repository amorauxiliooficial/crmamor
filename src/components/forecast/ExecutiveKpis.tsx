import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Target,
  TrendingDown,
  Wallet,
  CircleDollarSign,
} from "lucide-react";
import type { ExecutivoKpis } from "@/hooks/useExecutiveForecast";

interface Props {
  kpis: ExecutivoKpis;
  formatBRL: (n: number) => string;
}

interface KpiCard {
  label: string;
  value: number;
  icon: typeof TrendingUp;
  accent: string;
  hint?: string;
  hintColor?: string;
}

export function ExecutiveKpis({ kpis, formatBRL }: Props) {
  const atingimento = kpis.metaMes > 0 ? (kpis.receitaRecebidaMes / kpis.metaMes) * 100 : 0;
  const cards: KpiCard[] = [
    {
      label: "Receita Prevista",
      value: kpis.receitaPrevistaMes,
      icon: TrendingUp,
      accent: "text-sky-500 bg-sky-500/10",
      hint: "parcelas futuras do mês",
    },
    {
      label: "Meta do Mês",
      value: kpis.metaMes,
      icon: Target,
      accent: "text-primary bg-primary/10",
      hint: kpis.metaMes > 0 ? `${atingimento.toFixed(0)}% recebido` : "sem meta configurada",
    },
    {
      label: "Gap p/ Meta",
      value: Math.abs(kpis.gapPrevisto),
      icon: TrendingDown,
      accent:
        kpis.gapPrevisto > 0
          ? "text-rose-500 bg-rose-500/10"
          : "text-emerald-500 bg-emerald-500/10",
      hint:
        kpis.gapPrevisto > 0
          ? `Realizado: falta ${formatBRL(Math.max(kpis.gapRecebido, 0))}`
          : "Meta projetada coberta",
      hintColor: kpis.gapPrevisto > 0 ? "text-rose-500" : "text-emerald-500",
    },
    {
      label: "Receita Recebida",
      value: kpis.receitaRecebidaMes,
      icon: CircleDollarSign,
      accent: "text-emerald-500 bg-emerald-500/10",
      hint: "pagamentos confirmados no mês",
    },
    {
      label: "Saldo Operacional",
      value: kpis.saldoOperacional,
      icon: Wallet,
      accent:
        kpis.saldoOperacional >= 0
          ? "text-emerald-500 bg-emerald-500/10"
          : "text-rose-500 bg-rose-500/10",
      hint: `Despesas: ${formatBRL(kpis.despesasMes)}`,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="border-border/60">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {c.label}
                </span>
                <span className={cn("h-8 w-8 rounded-lg grid place-items-center", c.accent)}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <div className="text-xl font-bold tabular-nums">{formatBRL(c.value)}</div>
              {c.hint && (
                <div className={cn("text-[11px] text-muted-foreground", c.hintColor)}>{c.hint}</div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
