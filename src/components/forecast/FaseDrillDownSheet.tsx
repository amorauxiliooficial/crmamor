import { useMemo, useState } from "react";
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Clock, TrendingUp, Target, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FaseForecast } from "@/hooks/usePipelineForecast";
import { useMaesData } from "@/hooks/useMaesData";
import { useMaesFaseInfo, useTempoMedioPorFase } from "@/hooks/useMaeStatusHistory";
import { MaeDetailDialog } from "@/components/mae/MaeDetailDialog";
import type { MaeProcesso } from "@/types/mae";
import { calcularMesGravidez } from "@/lib/gestacaoUtils";

interface FaseDrillDownSheetProps {
  fase: FaseForecast | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatBRL: (n: number) => string;
  formatBRLShort: (n: number) => string;
}

function diasBadge(dias: number) {
  if (dias <= 6) return { tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" };
  if (dias <= 14) return { tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" };
  return { tone: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30" };
}

export function FaseDrillDownSheet({ fase, open, onOpenChange, formatBRL, formatBRLShort }: FaseDrillDownSheetProps) {
  const { maes } = useMaesData();
  const { data: tempoMedio } = useTempoMedioPorFase();
  const [search, setSearch] = useState("");
  const [selectedMae, setSelectedMae] = useState<MaeProcesso | null>(null);

  const maesDaFase = useMemo(() => {
    if (!fase) return [];
    const matches = (statusRaw: string) => {
      const status = statusRaw || "";
      const key = status.split(" ").slice(1).join(" ") || status;
      if (fase.faseKey === "Gestantes 1 a 8 meses") return key === "Gestantes 1 a 8 meses" || key === "Gestantes em Maturação";
      if (fase.faseKey === "Entradas do Mês") return key === "Entradas do Mês" || key === "Pendência Documental" || key === "Elegível";
      return status === fase.fase;
    };
    return maes.filter((m) => matches(m.status_processo));
  }, [maes, fase]);

  const ids = useMemo(() => maesDaFase.map((m) => m.id), [maesDaFase]);
  const { data: faseInfo } = useMaesFaseInfo(ids, fase?.fase ?? null);

  const filtered = useMemo(() => {
    if (!search) return maesDaFase;
    const s = search.toLowerCase();
    return maesDaFase.filter((m) => m.nome_mae?.toLowerCase().includes(s));
  }, [maesDaFase, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const da = faseInfo?.[a.id]?.diasNaFaseAtual ?? 0;
      const db = faseInfo?.[b.id]?.diasNaFaseAtual ?? 0;
      return db - da;
    });
  }, [filtered, faseInfo]);

  if (!fase) return null;

  const hasMeta = fase.metaValor > 0 || fase.metaQuantidade > 0;
  const tempoMedioFase = tempoMedio?.[fase.faseKey] ?? 0;

  return (
    <>
      <ResponsiveOverlay
        open={open}
        onOpenChange={onOpenChange}
        title={fase.fase.replace(/^[^\s]+\s/, "")}
        description={`${fase.quantidade} ${fase.quantidade === 1 ? "mãe" : "mães"} nesta fase · clique em uma mãe para ver detalhes`}
        desktopWidth="sm:max-w-2xl"
        mobileSide="right"
      >
        <div className="space-y-4">
          {/* KPIs da fase */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Stat icon={Users} label="Mães" value={String(fase.quantidade)} hint={hasMeta ? `meta ${fase.metaQuantidade}` : undefined} />
            <Stat icon={TrendingUp} label="Valor bruto" value={formatBRLShort(fase.valorBruto)} hint={hasMeta ? `meta ${formatBRLShort(fase.metaValor)}` : undefined} />
            <Stat
              icon={Target}
              label="Atingimento"
              value={hasMeta ? `${(fase.atingimentoPct * 100).toFixed(0)}%` : "—"}
              tone={hasMeta ? (fase.atingimentoPct >= 1 ? "success" : fase.atingimentoPct >= 0.6 ? "warning" : "danger") : "default"}
            />
            <Stat icon={Clock} label="Tempo médio" value={tempoMedioFase > 0 ? `${tempoMedioFase.toFixed(0)}d` : "—"} hint="histórico" />
          </div>

          {/* Gap visual */}
          {hasMeta && (
            <div className="rounded-lg border border-border/60 p-3 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progresso para a meta</span>
                <span className="font-semibold tabular-nums">
                  {formatBRL(fase.valorBruto)} / {formatBRL(fase.metaValor)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    fase.atingimentoPct >= 1 ? "bg-emerald-500" : fase.atingimentoPct >= 0.6 ? "bg-amber-500" : "bg-rose-500"
                  )}
                  style={{ width: `${Math.min(fase.atingimentoPct * 100, 100)}%` }}
                />
              </div>
              {fase.gapValor > 0 && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  Faltam {formatBRL(fase.gapValor)} ({fase.gapQuantidade > 0 ? `${fase.gapQuantidade} mães` : "—"})
                </p>
              )}
            </div>
          )}

          {/* Agrupamento por faixa gestacional - apenas para Gestantes 1 a 8 meses */}
          {fase.faseKey === "Gestantes 1 a 8 meses" && (
            <FaixasGestacionais maes={maesDaFase} ticketMedio={fase.ticketMedio} formatBRLShort={formatBRLShort} />
          )}


          {/* Lista de mães */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Mães nesta fase
              </h3>
              <div className="relative w-48">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-7 h-8 text-xs"
                />
              </div>
            </div>

            {sorted.length === 0 ? (
              <p className="text-xs text-muted-foreground italic text-center py-6">
                Nenhuma mãe encontrada
              </p>
            ) : (
              <div className="rounded-lg border border-border/60 divide-y divide-border/60">
                {sorted.map((m) => {
                  const info = faseInfo?.[m.id];
                  const dias = info?.diasNaFaseAtual ?? 0;
                  const diasTotais = info?.diasNoCRM ?? 0;
                  const badge = diasBadge(dias);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMae(m as MaeProcesso)}
                      className="w-full flex items-center justify-between gap-3 p-3 hover:bg-muted/40 transition-colors text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{m.nome_mae}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {diasTotais}d no CRM · ticket {formatBRLShort(fase.ticketMedio)}
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("text-xs font-semibold tabular-nums", badge.tone)}>
                        {dias}d nesta fase
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ResponsiveOverlay>

      <MaeDetailDialog
        mae={selectedMae}
        open={!!selectedMae}
        onOpenChange={(o) => !o && setSelectedMae(null)}
      />
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const TONE_TEXT: Record<string, string> = {
    default: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-rose-600 dark:text-rose-400",
  };
  return (
    <div className="rounded-lg border border-border/60 p-2.5 bg-card/50">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={cn("text-lg font-bold tabular-nums mt-0.5", TONE_TEXT[tone])}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground truncate">{hint}</div>}
    </div>
  );
}

const FAIXAS: Array<{ label: string; min: number; max: number }> = [
  { label: "1–3m", min: 1, max: 3 },
  { label: "4–5m", min: 4, max: 5 },
  { label: "6–7m", min: 6, max: 7 },
  { label: "8+m", min: 8, max: 99 },
];

function FaixasGestacionais({
  maes,
  ticketMedio,
  formatBRLShort,
}: {
  maes: MaeProcesso[];
  ticketMedio: number;
  formatBRLShort: (n: number) => string;
}) {
  const mesesPorMae = maes.map((m) => ({ mae: m, mes: calcularMesGravidez(m) }));
  const grupos = FAIXAS.map((f) => {
    const lista = mesesPorMae.filter(({ mes }) => mes !== null && mes >= f.min && mes <= f.max);
    return { ...f, qtd: lista.length, valor: lista.length * ticketMedio };
  });
  const semInfo = mesesPorMae.filter((x) => x.mes === null).length;
  const totalQtd = maes.length;
  const totalValor = totalQtd * ticketMedio;

  return (
    <div className="rounded-lg border border-pink-500/30 bg-pink-500/5 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-pink-700 dark:text-pink-300">
          Faixa gestacional
        </h3>
        <span className="text-xs text-muted-foreground">
          Total {totalQtd} mães · {formatBRLShort(totalValor)}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {grupos.map((g) => (
          <div key={g.label} className="rounded-md border border-border/60 bg-card/60 p-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {g.label}
            </div>
            <div className="text-lg font-bold tabular-nums text-pink-700 dark:text-pink-300">
              {g.qtd}
            </div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {formatBRLShort(g.valor)}
            </div>
          </div>
        ))}
      </div>
      {semInfo > 0 && (
        <p className="text-xs text-muted-foreground italic">
          {semInfo} {semInfo === 1 ? "mãe sem" : "mães sem"} mês gestacional informado
        </p>
      )}
    </div>
  );
}
