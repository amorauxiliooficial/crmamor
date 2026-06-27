import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, CheckCircle2, Pencil, Target, TrendingUp, Banknote } from "lucide-react";
import type { ComposicaoSugerida } from "@/hooks/useExecutiveForecast";

interface Props {
  composicao: ComposicaoSugerida;
  metaMes: number;
  receitaPrevista: number;
  receitaRecebida: number;
  formatBRL: (n: number) => string;
  onEditMeta?: () => void;
  canEdit?: boolean;
}

export function BaterMetaCard({
  composicao,
  metaMes,
  receitaPrevista,
  receitaRecebida,
  formatBRL,
  onEditMeta,
  canEdit,
}: Props) {
  const { gap, opcaoAVista, opcaoParcelada, opcaoMistaAVista, opcaoMistaParcelada } = composicao;
  const projecaoTotal = receitaRecebida + receitaPrevista;
  const pctAtingimento = metaMes > 0 ? Math.min((projecaoTotal / metaMes) * 100, 999) : 0;
  const pctRecebido = metaMes > 0 ? Math.min((receitaRecebida / metaMes) * 100, 100) : 0;
  const metaConfigurada = metaMes > 0;

  return (
    <Card className="border-pink-100 bg-gradient-to-br from-white via-pink-50/40 to-sky-50/30 shadow-sm">
      <CardContent className="p-5 md:p-7 space-y-5">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500 to-sky-500 text-white grid place-items-center shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold tracking-tight">Como bater a meta</h2>
              <p className="text-[11px] text-muted-foreground">
                Cálculos automáticos usando médias reais do sistema
              </p>
            </div>
          </div>
          {canEdit && onEditMeta && (
            <Button
              size="sm"
              variant="outline"
              className="border-pink-200 text-pink-700 hover:bg-pink-50 h-8"
              onClick={onEditMeta}
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Editar meta
            </Button>
          )}
        </div>

        {/* META + PROGRESSO */}
        <div className="rounded-2xl border border-pink-100 bg-white/80 p-4 md:p-5 space-y-3">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" /> Meta do mês
              </div>
              <div className="text-2xl md:text-3xl font-bold tabular-nums tracking-tight text-pink-600">
                {metaConfigurada ? formatBRL(metaMes) : "—"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Atingimento
              </div>
              <div className="text-xl font-bold tabular-nums text-sky-600">
                {metaConfigurada ? `${pctAtingimento.toFixed(0)}%` : "—"}
              </div>
            </div>
          </div>

          {metaConfigurada && (
            <div className="space-y-1.5">
              <Progress
                value={pctAtingimento}
                className="h-2.5 bg-pink-100 [&>div]:bg-gradient-to-r [&>div]:from-pink-500 [&>div]:to-sky-500"
              />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Recebido {pctRecebido.toFixed(0)}%</span>
                <span>100% da meta</span>
              </div>
            </div>
          )}

          {!metaConfigurada && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Nenhuma meta financeira configurada. {canEdit ? "Clique em \"Editar meta\" para definir." : "Solicite ao admin."}
            </p>
          )}
        </div>

        {/* MINI KPIs */}
        <div className="grid grid-cols-3 gap-2">
          <MiniKpi
            label="Recebido"
            value={formatBRL(receitaRecebida)}
            tone="emerald"
            icon={Banknote}
          />
          <MiniKpi
            label="Previsto"
            value={formatBRL(receitaPrevista)}
            tone="sky"
            icon={TrendingUp}
          />
          <MiniKpi
            label="Gap"
            value={formatBRL(Math.max(gap, 0))}
            tone={gap > 0 ? "pink" : "emerald"}
            icon={Target}
          />
        </div>

        {/* COMPOSIÇÃO */}
        {metaConfigurada && gap <= 0 ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-emerald-700">Meta projetada coberta</div>
              <div className="text-xs text-emerald-700/80 mt-0.5">
                Pipeline atual cobre o objetivo do mês — mantenha o ritmo.
              </div>
            </div>
          </div>
        ) : metaConfigurada ? (
          <div className="space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-1">
              Composição sugerida · ticket à vista {formatBRL(composicao.ticketAVista)} · parcela {formatBRL(composicao.ticketParceladoMes)}
            </div>
            <div className="space-y-2">
              <Option
                count={opcaoAVista}
                label={`${opcaoAVista === 1 ? "mãe à vista" : "mães à vista"}`}
                color="pink"
              />
              <Divider />
              <Option
                count={opcaoParcelada}
                label={`${opcaoParcelada === 1 ? "mãe parcelada" : "mães parceladas"}`}
                color="sky"
              />
              <Divider />
              <Option
                count={`${opcaoMistaAVista} + ${opcaoMistaParcelada}`}
                label={`mix (${opcaoMistaAVista} à vista · ${opcaoMistaParcelada} parceladas)`}
                color="gradient"
                highlight
              />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-2 px-2">
      <div className="flex-1 h-px bg-pink-100" />
      <span className="text-[9px] font-semibold tracking-[0.18em] text-muted-foreground/70">OU</span>
      <div className="flex-1 h-px bg-sky-100" />
    </div>
  );
}

function Option({
  count,
  label,
  color,
  highlight,
}: {
  count: number | string;
  label: string;
  color: "pink" | "sky" | "gradient";
  highlight?: boolean;
}) {
  const tones = {
    pink: "border-pink-200 bg-white hover:bg-pink-50/60",
    sky: "border-sky-200 bg-white hover:bg-sky-50/60",
    gradient: "border-transparent bg-gradient-to-r from-pink-500/10 to-sky-500/10",
  };
  const badge = {
    pink: "bg-pink-500 text-white",
    sky: "bg-sky-500 text-white",
    gradient: "bg-gradient-to-br from-pink-500 to-sky-500 text-white",
  };
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${tones[color]} ${
        highlight ? "ring-1 ring-pink-200/70 shadow-sm" : ""
      }`}
    >
      <span
        className={`h-9 min-w-9 px-2 rounded-lg grid place-items-center text-sm font-bold tabular-nums ${badge[color]}`}
      >
        {count}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function MiniKpi({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: "emerald" | "sky" | "pink";
  icon: typeof Target;
}) {
  const styles = {
    emerald: "border-emerald-200 bg-emerald-50/50 text-emerald-700",
    sky: "border-sky-200 bg-sky-50/50 text-sky-700",
    pink: "border-pink-200 bg-pink-50/50 text-pink-700",
  };
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${styles[tone]}`}>
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider opacity-80">
        <Icon className="h-2.5 w-2.5" />
        {label}
      </div>
      <div className="text-sm font-bold tabular-nums mt-0.5 truncate">{value}</div>
    </div>
  );
}
