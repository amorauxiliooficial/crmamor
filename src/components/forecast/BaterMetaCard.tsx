import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, CheckCircle2 } from "lucide-react";
import type { ComposicaoSugerida } from "@/hooks/useExecutiveForecast";

interface Props {
  composicao: ComposicaoSugerida;
  formatBRL: (n: number) => string;
}

export function BaterMetaCard({ composicao, formatBRL }: Props) {
  const { gap, opcaoAVista, opcaoParcelada, opcaoMistaAVista, opcaoMistaParcelada } = composicao;

  return (
    <Card className="border-border/60 h-full bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent">
      <CardContent className="p-5 md:p-7 space-y-5 h-full flex flex-col">
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Como bater a meta</h2>
            <p className="text-xs text-muted-foreground">Sugestões calculadas em tempo real</p>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Faltam</div>
          <div className="text-3xl font-bold tabular-nums tracking-tight text-primary">
            {formatBRL(gap)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            ticket à vista {formatBRL(composicao.ticketAVista)} · parcela {formatBRL(composicao.ticketParceladoMes)}
          </div>
        </div>

        {gap <= 0 ? (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-start gap-3 flex-1">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                Meta projetada coberta
              </div>
              <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                Mantenha o ritmo — pipeline atual cobre o objetivo do mês.
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 flex-1">
            <Option text={`${opcaoAVista} mães à vista`} />
            <div className="text-[10px] text-center text-muted-foreground tracking-wider">OU</div>
            <Option text={`${opcaoParcelada} mães parceladas`} />
            <div className="text-[10px] text-center text-muted-foreground tracking-wider">OU</div>
            <Option
              text={`${opcaoMistaAVista} à vista + ${opcaoMistaParcelada} parceladas`}
              highlight
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Option({ text, highlight }: { text: string; highlight?: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
        highlight
          ? "border-primary/40 bg-primary/5"
          : "border-border/60 bg-muted/30 hover:bg-muted/50"
      }`}
    >
      <span
        className={`h-7 w-7 rounded-full grid place-items-center text-xs font-bold ${
          highlight ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"
        }`}
      >
        ✦
      </span>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}
