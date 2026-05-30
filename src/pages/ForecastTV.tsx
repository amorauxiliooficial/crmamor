import { useEffect, useRef, useState } from "react";
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

const FASE_TONE: Record<string, { dot: string; bar: string; soft: string; text: string }> = {
  "Gestantes 1 a 8 meses": { dot: "bg-rose-400", bar: "bg-rose-400", soft: "bg-rose-400/5", text: "text-rose-400" },
  "Entradas do Mês":      { dot: "bg-amber-400", bar: "bg-amber-400", soft: "bg-amber-400/5", text: "text-amber-400" },
  "Aguardando Análise INSS": { dot: "bg-sky-400", bar: "bg-sky-400", soft: "bg-sky-400/5", text: "text-sky-400" },
  "Aprovada":             { dot: "bg-emerald-400", bar: "bg-emerald-400", soft: "bg-emerald-400/10", text: "text-emerald-400" },
};

// ============ Hooks utilitários ============

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function useCountUp(target: number, durationMs = 800) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    fromRef.current = value;
    startRef.current = performance.now();
    const animate = (t: number) => {
      const p = Math.min(1, (t - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = fromRef.current + (target - fromRef.current) * eased;
      setValue(next);
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}

function usePulse(deps: unknown[]) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(true);
    const id = window.setTimeout(() => setOn(false), 600);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return on;
}

// ============ UI pieces ============

function CornerBrackets() {
  const base = "absolute h-3 w-3 border-primary/40";
  return (
    <>
      <span className={cn(base, "top-1.5 left-1.5 border-t border-l")} />
      <span className={cn(base, "top-1.5 right-1.5 border-t border-r")} />
      <span className={cn(base, "bottom-1.5 left-1.5 border-b border-l")} />
      <span className={cn(base, "bottom-1.5 right-1.5 border-b border-r")} />
    </>
  );
}

function Sparkline({ seed, colorClass }: { seed: number; colorClass: string }) {
  // série sintética determinística (placeholder visual até termos histórico real)
  const N = 14;
  const points: number[] = [];
  let v = 0.4 + ((seed * 13) % 30) / 100;
  for (let i = 0; i < N; i++) {
    const noise = (Math.sin(seed + i * 0.9) + Math.cos(seed * 0.3 + i * 1.7)) * 0.08;
    const trend = i / (N - 1) * 0.35;
    v = Math.max(0.05, Math.min(0.95, 0.3 + trend + noise));
    points.push(v);
  }
  const w = 100;
  const h = 24;
  const stepX = w / (N - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(i * stepX).toFixed(2)} ${((1 - p) * h).toFixed(2)}`)
    .join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-6" preserveAspectRatio="none">
      <path d={area} className={cn("opacity-20", colorClass)} fill="currentColor" />
      <path d={path} className={colorClass} stroke="currentColor" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

function CountUpNumber({ value, formatter }: { value: number; formatter: (n: number) => string }) {
  const v = useCountUp(value);
  return <>{formatter(v)}</>;
}

// ============ Phase card ============

function PhaseCard({ f, seed }: { f: FaseForecast; seed: number }) {
  const tone = FASE_TONE[f.faseKey] ?? FASE_TONE["Gestantes 1 a 8 meses"];
  const hasMeta = f.metaQuantidade > 0 || f.metaValor > 0;
  const pct = Math.min(100, Math.round(f.atingimentoPct * 100));
  const faltaValor = Math.max(0, f.gapValor);
  const faltaQtd = Math.max(0, f.gapQuantidade);
  const batida = hasMeta && f.gapValor <= 0;

  // delta sintético (placeholder)
  const deltaQtd = ((seed * 7) % 5) - 2; // -2..+2
  const deltaValor = deltaQtd * (f.ticketMedio || 1800);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border border-border/60 bg-card p-5 overflow-hidden",
        batida && "ring-1 ring-emerald-400/40",
        tone.soft
      )}
    >
      <div className={cn("absolute top-0 left-0 right-0 h-1", tone.bar)} />
      <CornerBrackets />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("h-2.5 w-2.5 rounded-full", tone.dot)} />
          <span className="text-[11px] uppercase tracking-[0.15em] font-semibold text-muted-foreground truncate">
            {f.faseKey}
          </span>
        </div>
        <span
          className={cn(
            "font-mono text-[10px] font-bold tabular-nums",
            deltaQtd >= 0 ? "text-emerald-500" : "text-rose-500"
          )}
        >
          {deltaQtd >= 0 ? "▲" : "▼"} {deltaQtd >= 0 ? "+" : ""}{deltaQtd} · 24h
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-6xl font-bold leading-none tabular-nums">{f.quantidade}</span>
        <span className="text-sm text-muted-foreground">/ {hasMeta ? f.metaQuantidade : "—"} mães</span>
      </div>

      <div className={cn("mt-2", tone.text)}>
        <Sparkline seed={seed} colorClass={tone.text} />
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Realizado</span>
          <span className="font-mono text-lg font-semibold tabular-nums">
            <CountUpNumber value={f.valorBruto} formatter={formatBRLShort} />
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Meta</span>
          <span className="font-mono text-sm text-muted-foreground tabular-nums">
            {hasMeta ? formatBRLShort(f.metaValor) : "—"}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Velocidade</span>
          <span
            className={cn(
              "font-mono text-[11px] font-semibold tabular-nums",
              deltaValor >= 0 ? "text-emerald-500" : "text-rose-500"
            )}
          >
            {deltaValor >= 0 ? "+" : "−"}{formatBRLShort(Math.abs(deltaValor))} / 24h
          </span>
        </div>
      </div>

      {hasMeta && (
        <div className="mt-4">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-700", batida ? "bg-emerald-400" : tone.bar)}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="font-mono font-semibold tabular-nums text-muted-foreground">{pct}%</span>
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

// ============ Página ============

export default function ForecastTV() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const forecast = usePipelineForecast();
  const now = useNow(1000);

  const [lastSync, setLastSync] = useState<Date>(() => new Date());
  const syncPulse = usePulse([forecast.pipelineBruto, forecast.totalMaes]);

  useEffect(() => {
    setLastSync(new Date());
  }, [forecast.pipelineBruto, forecast.totalMaes]);

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

  const diaAtual = now.getDate();
  const diasNoMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const diasRestantes = Math.max(0, diasNoMes - diaAtual);
  const projecaoMes = diaAtual > 0 ? (realizado / diaAtual) * diasNoMes : 0;
  const projecaoPct = metaTotal > 0 ? Math.min(100, Math.round((projecaoMes / metaTotal) * 100)) : 0;

  // status do ritmo
  let ritmo: { label: string; color: string; bg: string; border: string };
  if (projecaoMes >= metaTotal) {
    ritmo = { label: "ACELERANDO", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" };
  } else if (projecaoMes >= metaTotal * 0.9) {
    ritmo = { label: "NO RITMO", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" };
  } else {
    ritmo = { label: "ATRASADO", color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" };
  }

  // ETA da meta no ritmo atual
  const ritmoDiario = diaAtual > 0 ? realizado / diaAtual : 0;
  let etaLabel = "—";
  if (metaBatida) {
    etaLabel = "Meta batida";
  } else if (ritmoDiario > 0) {
    const diasParaMeta = Math.ceil(gap / ritmoDiario);
    const eta = new Date(now);
    eta.setDate(eta.getDate() + diasParaMeta);
    etaLabel = eta.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }

  const secondsSinceSync = Math.max(0, Math.round((now.getTime() - lastSync.getTime()) / 1000));
  const clockStr = now.toLocaleTimeString("pt-BR", { hour12: false });

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background flex flex-col">
      {/* Grid técnico de fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 90%)",
        }}
      />
      {/* Scanline */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="tv-scanline absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      </div>

      <style>{`
        @keyframes tv-scan {
          0% { transform: translateY(-2vh); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        .tv-scanline { animation: tv-scan 14s linear infinite; }
        @keyframes tv-glow {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        .tv-glow { animation: tv-glow 4s ease-in-out infinite; }
        @keyframes tv-led {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        .tv-led { animation: tv-led 1.6s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <header className="relative flex items-center justify-between px-6 py-3 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/forecast")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight">Forecast · Modo TV</h1>
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
              )}>
                <span className={cn("h-1.5 w-1.5 rounded-full bg-emerald-500", syncPulse ? "" : "tv-led")} />
                AO VIVO
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-mono">
              {forecast.totalMaes} mães · dia {diaAtual}/{diasNoMes} · última sync há {secondsSinceSync}s
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Activity className="h-4 w-4 text-primary" />
          <span className="font-mono tabular-nums text-base text-foreground">{clockStr}</span>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 pt-5 pb-3">
        <div className="relative rounded-3xl border border-border/60 bg-card p-6 md:p-8 overflow-hidden">
          <CornerBrackets />
          {!metaBatida && (
            <div
              aria-hidden
              className="tv-glow pointer-events-none absolute -left-10 top-1/2 -translate-y-1/2 h-64 w-64 rounded-full"
              style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.35), transparent 70%)" }}
            />
          )}
          <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr] items-end">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] uppercase tracking-[0.2em] font-semibold text-muted-foreground">
                  {metaBatida ? "Meta do mês" : "Falta para a meta"}
                </p>
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border font-mono", ritmo.color, ritmo.bg, ritmo.border)}>
                  {ritmo.label}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-4 flex-wrap">
                <span
                  className={cn(
                    "font-mono text-7xl md:text-8xl font-bold leading-none tabular-nums",
                    metaBatida ? "text-emerald-500" : "text-primary"
                  )}
                  style={{ textShadow: metaBatida ? undefined : "0 0 50px hsl(var(--primary) / 0.45)" }}
                >
                  {metaBatida ? "Batida ✓" : <CountUpNumber value={gap} formatter={formatBRLShort} />}
                </span>
              </div>

              {/* Barra com marcador de projeção */}
              <div className="mt-5">
                <div className="relative h-2.5 w-full rounded-full bg-muted overflow-visible">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", metaBatida ? "bg-emerald-500" : "bg-primary")}
                    style={{ width: `${pctTotal}%` }}
                  />
                  {!metaBatida && projecaoPct > 0 && projecaoPct < 100 && (
                    <div
                      aria-hidden
                      className="absolute top-1/2 -translate-y-1/2 h-5 w-px bg-foreground/70"
                      style={{ left: `${projecaoPct}%` }}
                      title="Projeção do mês"
                    >
                      <span className="absolute -top-5 -translate-x-1/2 text-[9px] font-mono uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        projeção
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span>
                    <CountUpNumber value={realizado} formatter={formatBRLShort} /> de {formatBRLShort(metaTotal)}
                  </span>
                  <span className="font-semibold text-foreground">{pctTotal}%</span>
                </div>
                <p className="mt-1 text-[11px] font-mono text-muted-foreground">
                  ETA no ritmo atual: <span className="text-foreground font-semibold">{etaLabel}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative rounded-2xl border border-border/60 bg-background/50 p-4 overflow-hidden">
                <CornerBrackets />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Dias restantes</p>
                <p className="mt-1 font-mono text-3xl font-bold tabular-nums">{diasRestantes}</p>
              </div>
              <div className="relative rounded-2xl border border-border/60 bg-background/50 p-4 overflow-hidden">
                <CornerBrackets />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Projeção do mês</p>
                <p className={cn(
                  "mt-1 font-mono text-3xl font-bold tabular-nums",
                  projecaoMes >= metaTotal ? "text-emerald-500" : "text-foreground"
                )}>
                  <CountUpNumber value={projecaoMes} formatter={formatBRLShort} />
                </p>
              </div>
              <div className="relative rounded-2xl border border-border/60 bg-background/50 p-4 col-span-2 overflow-hidden">
                <CornerBrackets />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Pipeline ajustado (ponderado por probabilidade)
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                  <CountUpNumber value={forecast.pipelineAjustado} formatter={formatBRLShort} />
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 fases */}
      <section className="flex-1 px-6 pb-3 min-h-0">
        <div className="grid h-full grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {forecast.fases.map((f, idx) => (
            <PhaseCard key={f.fase} f={f} seed={idx + 1} />
          ))}
        </div>
      </section>

      {/* Rodapé técnico */}
      <footer className="relative flex items-center justify-between px-6 py-2 border-t border-border/60 bg-background/70 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
        <span>SYS · FORECAST v1 · LIVE</span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 tv-led" />
          stream ok
        </span>
        <span>{now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</span>
      </footer>
    </div>
  );
}
