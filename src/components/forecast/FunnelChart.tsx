import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FaseForecast } from "@/hooks/usePipelineForecast";
import { ChevronRight } from "lucide-react";

interface FunnelChartProps {
  fases: FaseForecast[];
  onFaseClick: (fase: FaseForecast) => void;
  formatBRLShort: (n: number) => string;
}

const FASE_TONE: Record<string, string> = {
  "Gestantes em Maturação": "rosa",
  "Pendência Documental": "amarelo",
  "Elegível (Análise Positiva)": "verde",
  "Aguardando Análise INSS": "azul",
  "Aprovada": "verde",
  "Renegociação": "laranja",
  "Inadimplência": "vermelho",
  "Recurso / Judicial": "vermelho",
};

const TONE_GRADIENT: Record<string, { from: string; to: string }> = {
  verde: { from: "hsl(142 71% 45%)", to: "hsl(142 76% 36%)" },
  amarelo: { from: "hsl(45 93% 58%)", to: "hsl(38 92% 50%)" },
  laranja: { from: "hsl(25 95% 58%)", to: "hsl(20 90% 48%)" },
  vermelho: { from: "hsl(0 84% 60%)", to: "hsl(0 72% 50%)" },
  azul: { from: "hsl(199 89% 55%)", to: "hsl(201 90% 42%)" },
  rosa: { from: "hsl(330 81% 65%)", to: "hsl(333 71% 50%)" },
  cinza: { from: "hsl(215 16% 55%)", to: "hsl(215 19% 35%)" },
};

function atingimentoColor(pct: number, hasMeta: boolean): string {
  if (!hasMeta) return "bg-muted-foreground/30";
  if (pct >= 1) return "bg-emerald-500";
  if (pct >= 0.6) return "bg-amber-500";
  return "bg-rose-500";
}

function atingimentoTextColor(pct: number, hasMeta: boolean): string {
  if (!hasMeta) return "text-muted-foreground";
  if (pct >= 1) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 0.6) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export function FunnelChart({ fases, onFaseClick, formatBRLShort }: FunnelChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  // Largura proporcional: cada fase encolhe gradualmente (funil real)
  // Width = baseWidth * (1 - index * step), respeitando volume relativo
  const maxQtd = Math.max(...fases.map((f) => f.quantidade), 1);
  const baseWidth = 100; // %
  const minWidth = 35; // %

  return (
    <div className="space-y-2">
      {fases.map((f, idx) => {
        const tone = FASE_TONE[f.faseKey] ?? "cinza";
        const grad = TONE_GRADIENT[tone];

        // Largura visual = funil decrescente + proporcional ao volume
        const funnelShrink = baseWidth - (idx / (fases.length - 1)) * (baseWidth - minWidth);
        const volumeRatio = Math.max(f.quantidade / maxQtd, 0.5);
        const width = Math.max(funnelShrink * volumeRatio, minWidth);

        const hasMeta = f.metaValor > 0 || f.metaQuantidade > 0;
        const pct = Math.min(f.atingimentoPct, 1.5);
        const isHovered = hovered === idx;

        return (
          <div key={f.fase} className="flex justify-center">
            <button
              type="button"
              onClick={() => onFaseClick(f)}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "group relative overflow-hidden rounded-xl text-left transition-all duration-300",
                "ring-1 ring-border/40 hover:ring-2 hover:shadow-2xl hover:-translate-y-0.5",
                "focus:outline-none focus:ring-2 focus:ring-primary",
                hovered !== null && !isHovered && "opacity-60"
              )}
              style={{
                width: `${width}%`,
                minWidth: "min(100%, 260px)",
                background: `linear-gradient(135deg, ${grad.from}, ${grad.to})`,
                animation: `fade-in 0.4s ease-out ${idx * 60}ms both`,
              }}
            >
              {/* shimmer hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

              <div className="relative p-3 md:p-4 text-white">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm md:text-base font-bold truncate drop-shadow-sm">
                        {f.fase.replace(/^[^\s]+\s/, "")}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 backdrop-blur shrink-0">
                        {f.quantidade}
                      </span>
                    </div>
                    <div className="text-[11px] text-white/85 mt-0.5 font-medium">
                      Bruto {formatBRLShort(f.valorBruto)}
                      {hasMeta && (
                        <> · Meta {formatBRLShort(f.metaValor)}</>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      {hasMeta ? (
                        <>
                          <div className="text-base md:text-lg font-bold tabular-nums drop-shadow-sm">
                            {(f.atingimentoPct * 100).toFixed(0)}%
                          </div>
                          <div className="text-[10px] text-white/80">da meta</div>
                        </>
                      ) : (
                        <div className="text-[10px] text-white/70 italic max-w-[80px]">
                          sem meta definida
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/70 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>

                {/* Progress bar meta vs realizado */}
                {hasMeta && (
                  <div className="mt-2.5 h-1.5 rounded-full bg-black/25 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700", atingimentoColor(f.atingimentoPct, hasMeta))}
                      style={{ width: `${Math.min(pct * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}

export { atingimentoTextColor };
