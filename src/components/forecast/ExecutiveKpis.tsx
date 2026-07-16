import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Target,
  TrendingDown,
  Wallet,
  CircleDollarSign,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { ExecutivoKpis } from "@/hooks/useExecutiveForecast";

export type KpiId = "prevista" | "recebida" | "meta" | "gap" | "saldo";

interface Props {
  kpis: ExecutivoKpis;
  formatBRL: (n: number) => string;
  onCardClick?: (id: KpiId) => void;
}

interface KpiCard {
  label: string;
  value: number;
  icon: typeof TrendingUp;
  accent: string;
  hint?: string;
  hintTone?: "muted" | "danger" | "success";
  trend?: number | null;
}

function TrendPill({ value }: { value: number }) {
  if (!isFinite(value) || Math.abs(value) < 0.5) {
    return <span className="text-xs text-muted-foreground">estável</span>;
  }
  const up = value > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums",
        up ? "text-emerald-500" : "text-rose-500",
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(0)}%
    </span>
  );
}

export function ExecutiveKpis({ kpis, formatBRL, onCardClick }: Props) {
  const atingimento = kpis.metaMes > 0 ? (kpis.receitaRecebidaMes / kpis.metaMes) * 100 : 0;
  const cards: (KpiCard & { id: KpiId })[] = [
    {
      id: "prevista",
      label: "Receita Prevista",
      value: kpis.receitaPrevistaMes,
      icon: TrendingUp,
      accent: "text-sky-500 bg-sky-500/10",
      hint: "parcelas futuras do mês",
      trend: kpis.deltaPrevistoPct,
    },
    {
      id: "recebida",
      label: "Receita Recebida",
      value: kpis.receitaRecebidaMes,
      icon: CircleDollarSign,
      accent: "text-emerald-500 bg-emerald-500/10",
      hint: "pagamentos confirmados",
      trend: kpis.deltaRecebidoPct,
    },
    {
      id: "meta",
      label: "Meta do Mês",
      value: kpis.metaMes,
      icon: Target,
      accent: "text-primary bg-primary/10",
      hint: kpis.metaMes > 0 ? `${atingimento.toFixed(0)}% recebido` : "sem meta configurada",
    },
    {
      id: "gap",
      label: "Gap p/ Meta",
      value: Math.abs(kpis.gapPrevisto),
      icon: TrendingDown,
      accent:
        kpis.gapPrevisto > 0
          ? "text-rose-500 bg-rose-500/10"
          : "text-emerald-500 bg-emerald-500/10",
      hint:
        kpis.gapPrevisto > 0
          ? `Falta ${formatBRL(Math.max(kpis.gapRecebido, 0))} no realizado`
          : "Meta projetada coberta",
      hintTone: kpis.gapPrevisto > 0 ? "danger" : "success",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card
            key={c.label}
            onClick={onCardClick ? () => onCardClick(c.id) : undefined}
            className={cn(
              "border-border/60 transition-all",
              onCardClick && "cursor-pointer hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5",
            )}
          >
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {c.label}
                </span>
                <span className={cn("h-8 w-8 rounded-lg grid place-items-center", c.accent)}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl font-bold tabular-nums tracking-tight">
                {formatBRL(c.value)}
              </div>
              <div className="flex items-center justify-between gap-2 min-h-[16px]">
                {c.hint && (
                  <span
                    className={cn(
                      "text-xs",
                      c.hintTone === "danger" && "text-rose-500",
                      c.hintTone === "success" && "text-emerald-500",
                      (!c.hintTone || c.hintTone === "muted") && "text-muted-foreground",
                    )}
                  >
                    {c.hint}
                  </span>
                )}
                {typeof c.trend === "number" && <TrendPill value={c.trend} />}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
