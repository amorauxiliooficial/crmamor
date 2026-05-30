import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FaseForecast } from "@/hooks/usePipelineForecast";
import { ChevronRight, Bell } from "lucide-react";

interface FunnelChartProps {
  fases: FaseForecast[];
  onFaseClick: (fase: FaseForecast) => void;
  formatBRLShort: (n: number) => string;
  gestantesCriticas?: number;
}

type Tone = "rosa" | "amarelo" | "verde" | "azul" | "laranja" | "vermelho" | "cinza";

const FASE_TONE: Record<string, Tone> = {
  "Gestantes 1 a 8 meses": "rosa",
  "Entradas do Mês": "amarelo",
  "Aguardando Análise INSS": "azul",
  "Aprovada": "verde",
};

// Classes Tailwind por tom — apenas semáforo/destaque, fundo do card permanece neutro
const TONE_CLASSES: Record<Tone, { bg: string; border: string; accent: string; bar: string; ring: string }> = {
  rosa: {
    bg: "bg-primary/[0.06]",
    border: "border-primary/20",
    accent: "text-primary",
    bar: "bg-primary",
    ring: "group-hover:ring-primary/40",
  },
  amarelo: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    accent: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    ring: "group-hover:ring-amber-500/40",
  },
  verde: {
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
    accent: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
    ring: "group-hover:ring-emerald-500/40",
  },
  azul: {
    bg: "bg-sky-500/5",
    border: "border-sky-500/20",
    accent: "text-sky-600 dark:text-sky-400",
    bar: "bg-sky-500",
    ring: "group-hover:ring-sky-500/40",
  },
  laranja: {
    bg: "bg-orange-500/5",
    border: "border-orange-500/20",
    accent: "text-orange-600 dark:text-orange-400",
    bar: "bg-orange-500",
    ring: "group-hover:ring-orange-500/40",
  },
  vermelho: {
    bg: "bg-rose-500/5",
    border: "border-rose-500/20",
    accent: "text-rose-600 dark:text-rose-400",
    bar: "bg-rose-500",
    ring: "group-hover:ring-rose-500/40",
  },
  cinza: {
    bg: "bg-muted/30",
    border: "border-border/60",
    accent: "text-muted-foreground",
    bar: "bg-muted-foreground/50",
    ring: "group-hover:ring-border",
  },
};

function atingimentoColor(pct: number): string {
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

export function FunnelChart({ fases, onFaseClick, formatBRLShort, gestantesCriticas = 0 }: FunnelChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  // Funil decrescente fixo: cada linha encolhe 5% da largura
  const baseWidth = 100;
  const shrinkStep = 5;
  const minWidth = 62;

  return (
    <div className="space-y-2">
      {fases.map((f, idx) => {
        const tone = FASE_TONE[f.faseKey] ?? "cinza";
        const tc = TONE_CLASSES[tone];
        const hasMeta = f.metaValor > 0 || f.metaQuantidade > 0;
        const pct = Math.min(f.atingimentoPct, 1.5);
        const isHovered = hovered === idx;
        const width = Math.max(baseWidth - idx * shrinkStep, minWidth);
        const showAlerta = f.faseKey === "Gestantes 1 a 8 meses" && gestantesCriticas > 0;

        return (
          <div key={f.fase} className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onFaseClick(f)}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "group relative overflow-hidden rounded-2xl text-left transition-all duration-300",
                "ring-1",
                tc.bg,
                tc.border,
                tc.ring,
                "hover:translate-x-1 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary",
                hovered !== null && !isHovered && "opacity-70"
              )}
              style={{
                width: `${width}%`,
                animation: `fade-in 0.4s ease-out ${idx * 50}ms both`,
              }}
            >
              <div className="relative flex items-center gap-3 px-4 py-3 md:py-3.5">
                {/* Lado esquerdo: nome + contexto */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-sm md:text-base font-bold tracking-tight truncate", tc.accent)}>
                      {f.fase.replace(/^[^\s]+\s/, "")}
                    </span>

                    {showAlerta && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wide animate-pulse shadow-sm">
                        <Bell className="h-3 w-3" />
                        {gestantesCriticas} em 7º-8º · contato
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    <span className="font-semibold tabular-nums">{f.quantidade}</span>{" "}
                    {f.quantidade === 1 ? "mãe" : "mães"}
                    {hasMeta && (
                      <>
                        {" · meta "}
                        <span className="tabular-nums">{f.metaQuantidade || "—"}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Lado direito: valor + barra */}
                <div className="shrink-0 flex items-center gap-3">
                  <div className="text-right">
                    <div className={cn("text-base md:text-lg font-bold tabular-nums leading-none", tc.accent)}>
                      {formatBRLShort(f.valorBruto)}
                    </div>
                    {hasMeta ? (
                      <div className="mt-1 flex items-center justify-end gap-1.5">
                        <div className="w-20 h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-700", atingimentoColor(f.atingimentoPct))}
                            style={{ width: `${Math.min(pct * 100, 100)}%` }}
                          />
                        </div>
                        <span className={cn("text-[10px] font-bold tabular-nums", atingimentoTextColor(f.atingimentoPct, true))}>
                          {(f.atingimentoPct * 100).toFixed(0)}%
                        </span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-muted-foreground/70 italic mt-1">sem meta</div>
                    )}
                  </div>

                  <ChevronRight className={cn("h-4 w-4 text-muted-foreground/50 transition-all", tc.accent, "group-hover:translate-x-0.5")} />
                </div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}

export { atingimentoTextColor };
