import { AlertTriangle, ShieldAlert, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskBannerProps {
  valorRisco: number;
  fasesCriticas: number;
  gapMeta: number;
  formatBRL: (n: number) => string;
  gestantesCriticas?: number;
}

export function RiskBanner({ valorRisco, fasesCriticas, gapMeta, formatBRL, gestantesCriticas = 0 }: RiskBannerProps) {
  const hasRisk = valorRisco > 0 || fasesCriticas > 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border backdrop-blur-xl",
        hasRisk
          ? "border-rose-500/40 bg-gradient-to-r from-rose-500/15 via-rose-500/5 to-transparent"
          : "border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent"
      )}
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-rose-500 to-rose-700" style={{ opacity: hasRisk ? 1 : 0 }} />
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 p-4 md:p-5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={cn(
              "shrink-0 h-11 w-11 rounded-xl flex items-center justify-center ring-1",
              hasRisk
                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-rose-500/30"
                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30"
            )}
          >
            {hasRisk ? <AlertTriangle className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Pipeline em Risco
              </span>
              {hasRisk && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-500" />
                  </span>
                  ATENÇÃO
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2 flex-wrap mt-0.5">
              <span className="text-2xl md:text-3xl font-bold tracking-tight tabular-nums">
                {formatBRL(valorRisco)}
              </span>
              <span className="text-xs text-muted-foreground">
                em {fasesCriticas} {fasesCriticas === 1 ? "fase crítica" : "fases críticas"}
              </span>
            </div>
          </div>
        </div>

        <div className="hidden sm:block h-12 w-px bg-border/60" />

        <div className="flex items-center gap-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Gap vs Meta
            </div>
            <div
              className={cn(
                "text-lg md:text-xl font-bold tabular-nums",
                gapMeta > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {gapMeta > 0 ? "−" : "+"}
              {formatBRL(Math.abs(gapMeta))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
