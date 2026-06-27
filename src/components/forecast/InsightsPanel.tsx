import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, TrendingUp, TrendingDown, AlertTriangle, Target, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type InsightTone = "positive" | "negative" | "warning" | "info" | "neutral";

export interface InsightItem {
  id: string;
  text: string;
  tone: InsightTone;
  icon?: typeof TrendingUp;
}

interface Props {
  insights: InsightItem[];
}

const TONE_STYLES: Record<InsightTone, { bg: string; text: string; border: string }> = {
  positive: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
  },
  negative: {
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/20",
  },
  warning: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
  },
  info: {
    bg: "bg-sky-500/10",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500/20",
  },
  neutral: {
    bg: "bg-muted",
    text: "text-foreground",
    border: "border-border/60",
  },
};

export function InsightsPanel({ insights }: Props) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-5 md:p-7 space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 grid place-items-center">
            <Lightbulb className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Insights</h2>
            <p className="text-xs text-muted-foreground">
              Análise automática dos seus dados em tempo real
            </p>
          </div>
        </div>

        {insights.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Cadastre mães e pagamentos para gerar insights automáticos.
          </p>
        ) : (
          <div className="grid gap-2.5 md:grid-cols-2">
            {insights.map((i) => {
              const style = TONE_STYLES[i.tone];
              const Icon = i.icon ?? Lightbulb;
              return (
                <div
                  key={i.id}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3.5 transition-colors",
                    style.bg,
                    style.border,
                  )}
                >
                  <span className={cn("h-7 w-7 rounded-lg grid place-items-center shrink-0", style.text)}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <p className={cn("text-sm leading-snug", style.text)}>{i.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { TrendingUp, TrendingDown, AlertTriangle, Target, Users };
