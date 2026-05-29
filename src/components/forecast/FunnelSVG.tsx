import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FaseForecast } from "@/hooks/usePipelineForecast";

interface FunnelSVGProps {
  fases: FaseForecast[];
  formatBRLShort: (n: number) => string;
}

const FASE_TONE: Record<string, string> = {
  "Pendência Documental": "amarelo",
  "Elegível (Análise Positiva)": "verde",
  "Aguardando Análise INSS": "azul",
  "Aprovada": "verde",
  "Renegociação": "laranja",
  "Inadimplência": "vermelho",
  "Recurso / Judicial": "vermelho",
};

// HSL tokens — usa cores semânticas mas com valores fixos para o SVG (necessário em <stop>)
const TONE_COLORS: Record<string, { from: string; to: string; ring: string; text: string }> = {
  verde: { from: "hsl(142 71% 45%)", to: "hsl(142 76% 36%)", ring: "hsl(142 71% 45% / 0.4)", text: "text-emerald-600 dark:text-emerald-400" },
  amarelo: { from: "hsl(45 93% 58%)", to: "hsl(38 92% 50%)", ring: "hsl(45 93% 58% / 0.4)", text: "text-amber-600 dark:text-amber-400" },
  laranja: { from: "hsl(25 95% 58%)", to: "hsl(20 90% 48%)", ring: "hsl(25 95% 58% / 0.4)", text: "text-orange-600 dark:text-orange-400" },
  vermelho: { from: "hsl(0 84% 60%)", to: "hsl(0 72% 50%)", ring: "hsl(0 84% 60% / 0.4)", text: "text-rose-600 dark:text-rose-400" },
  azul: { from: "hsl(199 89% 55%)", to: "hsl(201 90% 42%)", ring: "hsl(199 89% 55% / 0.4)", text: "text-sky-600 dark:text-sky-400" },
  cinza: { from: "hsl(215 16% 55%)", to: "hsl(215 19% 35%)", ring: "hsl(215 16% 55% / 0.4)", text: "text-slate-500" },
};

export function FunnelSVG({ fases, formatBRLShort }: FunnelSVGProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const visibleFases = fases.filter((f) => f.quantidade > 0);
  const phasesToRender = visibleFases.length > 0 ? visibleFases : fases;

  const maxBruto = Math.max(...phasesToRender.map((f) => f.valorBruto), 1);
  const VIEWBOX_W = 600;
  const STAGE_H = 78;
  const GAP = 6;
  const MIN_WIDTH_RATIO = 0.18;
  const totalH = phasesToRender.length * STAGE_H + (phasesToRender.length - 1) * GAP;

  // calcula larguras top/bottom de cada trapézio
  const widths = phasesToRender.map((f) => {
    const ratio = Math.max(f.valorBruto / maxBruto, MIN_WIDTH_RATIO);
    return ratio * VIEWBOX_W;
  });

  // O funil afunila — cada trapézio começa com largura do anterior (ou própria se 1º) e termina na própria
  const topWidths = widths.map((w, i) => (i === 0 ? w : Math.max(w, widths[i - 1])));
  const bottomWidths = widths.map((w, i) => (i === widths.length - 1 ? w : Math.min(w, widths[i + 1] ?? w)));

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${VIEWBOX_W} ${totalH}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {phasesToRender.map((f, i) => {
            const tone = FASE_TONE[f.faseKey] ?? "cinza";
            const c = TONE_COLORS[tone];
            return (
              <linearGradient key={i} id={`grad-${i}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={c.from} stopOpacity="0.95" />
                <stop offset="100%" stopColor={c.to} stopOpacity="0.95" />
              </linearGradient>
            );
          })}
          <filter id="funnelShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>

        {phasesToRender.map((f, i) => {
          const tone = FASE_TONE[f.faseKey] ?? "cinza";
          const c = TONE_COLORS[tone];
          const y = i * (STAGE_H + GAP);
          const topW = topWidths[i];
          const botW = bottomWidths[i];
          const topX = (VIEWBOX_W - topW) / 2;
          const botX = (VIEWBOX_W - botW) / 2;
          const points = `${topX},${y} ${topX + topW},${y} ${botX + botW},${y + STAGE_H} ${botX},${y + STAGE_H}`;
          const isHovered = hovered === i;
          const isDimmed = hovered !== null && !isHovered;

          return (
            <g
              key={f.fase}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                transition: "opacity 0.2s, transform 0.2s",
                opacity: isDimmed ? 0.4 : 1,
                cursor: "pointer",
                animation: `fade-in 0.4s ease-out ${i * 70}ms both`,
              }}
            >
              <polygon
                points={points}
                fill={`url(#grad-${i})`}
                stroke={c.from}
                strokeWidth={isHovered ? 2 : 0.5}
                filter="url(#funnelShadow)"
              />
              {/* Label central */}
              <text
                x={VIEWBOX_W / 2}
                y={y + STAGE_H / 2 - 6}
                textAnchor="middle"
                fill="white"
                fontSize="14"
                fontWeight="700"
                style={{ pointerEvents: "none", textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
              >
                {f.fase.replace(/^[^\s]+\s/, "")}
              </text>
              <text
                x={VIEWBOX_W / 2}
                y={y + STAGE_H / 2 + 14}
                textAnchor="middle"
                fill="white"
                fontSize="12"
                fontWeight="500"
                opacity="0.9"
                style={{ pointerEvents: "none" }}
              >
                {f.quantidade} {f.quantidade === 1 ? "mãe" : "mães"} · {formatBRLShort(f.valorAjustado)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legenda lateral com detalhes da fase em hover */}
      {hovered !== null && phasesToRender[hovered] && (
        <div className="absolute top-2 right-2 max-w-[220px] rounded-lg border border-border/60 bg-background/95 backdrop-blur-xl p-3 shadow-xl animate-fade-in pointer-events-none">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {phasesToRender[hovered].fase.replace(/^[^\s]+\s/, "")}
          </div>
          <div className="mt-2 space-y-1.5 text-xs">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Bruto</span>
              <span className="font-semibold tabular-nums">{formatBRLShort(phasesToRender[hovered].valorBruto)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Ajustado</span>
              <span className="font-semibold tabular-nums">{formatBRLShort(phasesToRender[hovered].valorAjustado)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Probabilidade</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  TONE_COLORS[FASE_TONE[phasesToRender[hovered].faseKey] ?? "cinza"].text
                )}
              >
                {(phasesToRender[hovered].probabilidade * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
