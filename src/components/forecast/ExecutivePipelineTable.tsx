import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronRight, Layers } from "lucide-react";
import type { FaseForecast } from "@/hooks/usePipelineForecast";

interface Props {
  fases: FaseForecast[];
  onFaseClick: (f: FaseForecast) => void;
  formatBRLShort: (n: number) => string;
}

const TONE_DOT: Record<string, string> = {
  "Gestantes 1 a 8 meses": "bg-pink-500",
  "Entradas do Mês": "bg-amber-500",
  "Aguardando Análise INSS": "bg-sky-500",
  "Aprovada": "bg-emerald-500",
};

function progressBarTone(pct: number, hasMeta: boolean) {
  if (!hasMeta) return "bg-muted-foreground/30";
  if (pct >= 1) return "bg-emerald-500";
  if (pct >= 0.7) return "bg-amber-500";
  return "bg-rose-500";
}

export function ExecutivePipelineTable({ fases, onFaseClick, formatBRLShort }: Props) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-5 md:p-7 space-y-5">
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Layers className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Pipeline Executivo</h2>
            <p className="text-xs text-muted-foreground">
              Clique numa etapa para abrir o detalhe das mães
            </p>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full border-separate border-spacing-y-1.5 min-w-[720px] px-2">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left font-medium pl-3 pb-1">Etapa</th>
                <th className="text-right font-medium pb-1">Atual</th>
                <th className="text-right font-medium pb-1">Meta estrut.</th>
                <th className="text-right font-medium pb-1">Meta mês</th>
                <th className="text-right font-medium pb-1">Pipeline</th>
                <th className="text-right font-medium pb-1">Gap</th>
                <th className="text-right font-medium pr-3 pb-1 w-[160px]">%</th>
                <th aria-hidden className="w-4" />
              </tr>
            </thead>
            <tbody>
              {fases.map((f) => {
                const hasMeta = f.metaValor > 0 || f.metaQuantidade > 0;
                const pct = Math.min(f.atingimentoPct, 1);
                return (
                  <tr
                    key={f.fase}
                    onClick={() => onFaseClick(f)}
                    className="group cursor-pointer rounded-lg bg-card hover:bg-muted/40 transition-colors"
                  >
                    <td className="rounded-l-lg pl-3 py-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            TONE_DOT[f.faseKey] ?? "bg-muted-foreground",
                          )}
                        />
                        <span className="text-sm font-medium truncate">{f.faseKey}</span>
                      </div>
                    </td>
                    <td className="text-right text-sm font-semibold tabular-nums py-3">
                      {f.quantidade}
                    </td>
                    <td className="text-right text-xs text-muted-foreground tabular-nums py-3">
                      {f.metaQuantidade || "—"}
                    </td>
                    <td className="text-right text-xs text-muted-foreground tabular-nums py-3">
                      {hasMeta ? formatBRLShort(f.metaValor) : "—"}
                    </td>
                    <td className="text-right text-sm font-semibold tabular-nums py-3">
                      {formatBRLShort(f.valorBruto)}
                    </td>
                    <td
                      className={cn(
                        "text-right text-xs tabular-nums font-medium py-3",
                        !hasMeta && "text-muted-foreground",
                        hasMeta && f.gapValor > 0 && "text-rose-500",
                        hasMeta && f.gapValor <= 0 && "text-emerald-500",
                      )}
                    >
                      {hasMeta
                        ? `${f.gapValor > 0 ? "−" : "+"}${formatBRLShort(Math.abs(f.gapValor))}`
                        : "—"}
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2 justify-end">
                        <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full transition-all", progressBarTone(f.atingimentoPct, hasMeta))}
                            style={{ width: `${pct * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold tabular-nums w-9 text-right">
                          {hasMeta ? `${(f.atingimentoPct * 100).toFixed(0)}%` : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="rounded-r-lg pr-3">
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
