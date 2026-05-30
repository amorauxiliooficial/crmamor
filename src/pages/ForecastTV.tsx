import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePipelineForecast, type FaseForecast } from "@/hooks/usePipelineForecast";
import { Loader2, ArrowLeft, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const formatBRLShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `R$ ${(n / 1_000).toFixed(1)}k`;
  return formatBRL(n);
};

const FASE_TONE: Record<string, { dot: string; bar: string; ring: string; soft: string }> = {
  "Gestantes 1 a 8 meses": {
    dot: "bg-rose-400",
    bar: "bg-rose-400",
    ring: "ring-rose-400/30",
    soft: "bg-rose-400/5",
  },
  "Entradas do Mês": {
    dot: "bg-amber-400",
    bar: "bg-amber-400",
    ring: "ring-amber-400/30",
    soft: "bg-amber-400/5",
  },
  "Aguardando Análise INSS": {
    dot: "bg-sky-400",
    bar: "bg-sky-400",
    ring: "ring-sky-400/30",
    soft: "bg-sky-400/5",
  },
  Aprovada: {
    dot: "bg-emerald-400",
    bar: "bg-emerald-400",
    ring: "ring-emerald-400/30",
    soft: "bg-emerald-400/10",
  },
};

function PhaseCard({ f }: { f: FaseForecast }) {
  const tone = FASE_TONE[f.faseKey] ?? FASE_TONE["Gestantes 1 a 8 meses"];
  const hasMeta = f.metaQuantidade > 0 || f.metaValor > 0;
  const pct = Math.min(100, Math.round(f.atingimentoPct * 100));
  const faltaValor = Math.max(0, f.gapValor);
  const faltaQtd = Math.max(0, f.gapQuantidade);
  const batida = hasMeta && f.gapValor <= 0;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border border-border/60 bg-card p-5 overflow-hidden",
        batida && "ring-1 ring-emerald-400/40",
        tone.soft
      )}
    >
      {/* top bar */}
      <div className={cn("absolute top-0 left-0 right-0 h-1", tone.bar)} />

      {/* phase name */}
      <div className="flex items-center gap-2">
        <span className={cn("h-2.5 w-2.5 rounded-full", tone.dot)} />
        <span className="text-[11px] uppercase tracking-[0.15em] font-semibold text-muted-foreground">
          {f.faseKey}
        </span>
      </div>

      {/* count */}
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-6xl font-bold leading-none tabular-nums">
          {f.quantidade}
        </span>
        <span className="text-sm text-muted-foreground">
          / {hasMeta ? f.metaQuantidade : "—"} mães
        </span>
      </div>

      {/* values */}
      <div className="mt-4 space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Realizado
          </span>
          <span className="font-mono text-lg font-semibold tabular-nums">
            {formatBRLShort(f.valorBruto)}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Meta</span>
          <span className="font-mono text-sm text-muted-foreground tabular-nums">
            {hasMeta ? formatBRLShort(f.metaValor) : "—"}
          </span>
        </div>
      </div>

      {/* progress */}
      {hasMeta && (
        <div className="mt-4">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", batida ? "bg-emerald-400" : tone.bar)}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="font-mono font-semibold tabular-nums text-muted-foreground">
              {pct}%
            </span>
            {batida ? (
              <span className="font-semibold text-emerald-500">Meta batida ✓</span>
            ) : (
              <span className="font-mono font-semibold text-primary tabular-nums">
                faltam {formatBRLShort(faltaValor)} · {faltaQtd} mães
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ForecastTV() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const forecast = usePipelineForecast();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  if (authLoading || forecast.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const metaTotal = forecast.metaTotalValor;
  const realizado = forecast.pipelineBruto;
  const gap = Math.max(0, forecast.gapMetaTotal);
  const pctTotal = metaTotal > 0 ? Math.min(100, Math.round((realizado / metaTotal) * 100)) : 0;
  const metaBatida = metaTotal > 0 && gap <= 0;

  // run-rate baseado no dia do mês
  const now = new Date();
  const diaAtual = now.getDate();
  const diasNoMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const diasRestantes = Math.max(0, diasNoMes - diaAtual);
  const projecaoMes = diaAtual > 0 ? (realizado / diaAtual) * diasNoMes : 0;

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/forecast")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight">Forecast · Modo TV</h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                AO VIVO
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {forecast.totalMaes} mães no pipeline · dia {diaAtual}/{diasNoMes}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="h-4 w-4 text-primary" />
          <span className="font-mono">
            {now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </span>
        </div>
      </header>

      {/* hero gap */}
      <section className="px-6 pt-6 pb-4">
        <div className="rounded-3xl border border-border/60 bg-card p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr] items-end">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] font-semibold text-muted-foreground">
                {metaBatida ? "Meta do mês" : "Falta para a meta"}
              </p>
              <div className="mt-2 flex items-baseline gap-4 flex-wrap">
                <span
                  className={cn(
                    "font-mono text-7xl md:text-8xl font-bold leading-none tabular-nums",
                    metaBatida ? "text-emerald-500" : "text-primary"
                  )}
                  style={{ textShadow: metaBatida ? undefined : "0 0 40px hsl(var(--primary) / 0.35)" }}
                >
                  {metaBatida ? "Batida ✓" : formatBRLShort(gap)}
                </span>
              </div>
              <div className="mt-5">
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      metaBatida ? "bg-emerald-500" : "bg-primary"
                    )}
                    style={{ width: `${pctTotal}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span>
                    {formatBRLShort(realizado)} de {formatBRLShort(metaTotal)}
                  </span>
                  <span className="font-semibold text-foreground">{pctTotal}%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Dias restantes
                </p>
                <p className="mt-1 font-mono text-3xl font-bold tabular-nums">{diasRestantes}</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/50 p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Projeção do mês
                </p>
                <p
                  className={cn(
                    "mt-1 font-mono text-3xl font-bold tabular-nums",
                    projecaoMes >= metaTotal ? "text-emerald-500" : "text-foreground"
                  )}
                >
                  {formatBRLShort(projecaoMes)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/50 p-4 col-span-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Pipeline ajustado (ponderado por probabilidade)
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                  {formatBRLShort(forecast.pipelineAjustado)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 phase cards */}
      <section className="flex-1 px-6 pb-6 min-h-0">
        <div className="grid h-full grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {forecast.fases.map((f) => (
            <PhaseCard key={f.fase} f={f} />
          ))}
        </div>
      </section>
    </div>
  );
}
