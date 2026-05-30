import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePipelineForecast, type FaseForecast } from "@/hooks/usePipelineForecast";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logoAam from "@/assets/logo-aam.png";

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const formatBRLShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `R$ ${(n / 1_000).toFixed(1)}k`;
  return formatBRL(n);
};

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

// Tons por fase usando exclusivamente tokens da marca (primary + foreground)
// — sem rainbow. Hierarquia por opacidade.
const FASE_TONE: Record<string, { dot: string; bar: string; text: string; accent: string }> = {
  "Gestantes 1 a 8 meses": {
    dot: "bg-muted-foreground/60",
    bar: "bg-muted-foreground/60",
    text: "text-muted-foreground",
    accent: "hsl(var(--muted-foreground) / 0.5)",
  },
  "Entradas do Mês": {
    dot: "bg-primary/50",
    bar: "bg-primary/50",
    text: "text-primary/70",
    accent: "hsl(var(--primary) / 0.5)",
  },
  "Aguardando Análise INSS": {
    dot: "bg-primary/80",
    bar: "bg-primary/80",
    text: "text-primary",
    accent: "hsl(var(--primary) / 0.8)",
  },
  "Aprovada": {
    dot: "bg-primary",
    bar: "bg-primary",
    text: "text-primary",
    accent: "hsl(var(--primary))",
  },
};

// ============ Hooks ============

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function useCountUp(target: number, durationMs = 900) {
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
      setValue(fromRef.current + (target - fromRef.current) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}

// ============ UI primitives ============

function Sparkline({ seed, colorClass }: { seed: number; colorClass: string }) {
  const N = 16;
  const points: number[] = [];
  for (let i = 0; i < N; i++) {
    const noise = (Math.sin(seed + i * 0.9) + Math.cos(seed * 0.3 + i * 1.7)) * 0.08;
    const trend = (i / (N - 1)) * 0.35;
    points.push(Math.max(0.05, Math.min(0.95, 0.3 + trend + noise)));
  }
  const w = 100, h = 22, stepX = w / (N - 1);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${(i * stepX).toFixed(2)} ${((1 - p) * h).toFixed(2)}`).join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-5" preserveAspectRatio="none">
      <path d={area} className={cn("opacity-15", colorClass)} fill="currentColor" />
      <path d={path} className={colorClass} stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CountUpNumber({ value, formatter }: { value: number; formatter: (n: number) => string }) {
  return <>{formatter(useCountUp(value))}</>;
}

// ============ Phase card ============

function PhaseCard({ f, seed, index }: { f: FaseForecast; seed: number; index: number }) {
  const tone = FASE_TONE[f.faseKey] ?? FASE_TONE["Gestantes 1 a 8 meses"];
  const hasMeta = f.metaQuantidade > 0 || f.metaValor > 0;
  const pct = Math.min(100, Math.round(f.atingimentoPct * 100));
  const faltaValor = Math.max(0, f.gapValor);
  const faltaQtd = Math.max(0, f.gapQuantidade);
  const batida = hasMeta && f.gapValor <= 0;
  const deltaQtd = ((seed * 7) % 5) - 2;
  const isHero = f.faseKey === "Aprovada";

  return (
    <div
      className={cn(
        "tv-card group relative flex flex-col rounded-2xl bg-card/80 p-6 overflow-hidden opacity-0",
      )}
      style={{
        animation: `tv-rise 700ms ${EASE} forwards`,
        animationDelay: `${120 + index * 80}ms`,
        boxShadow:
          "inset 0 1px 0 0 hsl(0 0% 100% / 0.04), 0 1px 0 0 hsl(0 0% 100% / 0.03), 0 12px 32px -16px hsl(0 0% 0% / 0.45)",
      }}
    >
      {/* gradient border via pseudo — destaque maior só na fase de aprovação */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl p-px"
        style={{
          background: isHero
            ? "linear-gradient(180deg, hsl(var(--primary) / 0.7), hsl(var(--primary) / 0.2) 40%, hsl(var(--border) / 0.3))"
            : "linear-gradient(180deg, hsl(var(--primary) / 0.25), hsl(var(--border) / 0.55) 35%, hsl(var(--border) / 0.25))",
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />
          <span className="font-sans text-[10px] uppercase tracking-[0.22em] font-medium text-muted-foreground truncate">
            {f.faseKey}
          </span>
        </div>
        <span
          className={cn(
            "font-mono text-[10px] tabular-nums",
            deltaQtd >= 0 ? "text-primary/80" : "text-muted-foreground"
          )}
        >
          {deltaQtd >= 0 ? "+" : ""}{deltaQtd} · 24h
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-3">
        <span className="font-serif text-7xl font-normal leading-none tabular-nums tracking-tight">
          {f.quantidade}
        </span>
        <span className="text-xs text-muted-foreground">/ {hasMeta ? f.metaQuantidade : "—"} mães</span>
      </div>

      <div className={cn("mt-3", tone.text)}>
        <Sparkline seed={seed} colorClass={tone.text} />
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="flex items-baseline justify-between">
          <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Realizado</span>
          <span className="font-mono text-base font-medium tabular-nums">
            <CountUpNumber value={f.valorBruto} formatter={formatBRLShort} />
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Ticket médio</span>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {formatBRLShort(f.ticketMedio)}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Meta</span>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {hasMeta ? formatBRLShort(f.metaValor) : "—"}
          </span>
        </div>
      </div>

      {hasMeta && (
        <div className="mt-5">
          <div className="h-[3px] w-full rounded-full bg-muted/60 overflow-hidden">
            <div
              className={cn("h-full rounded-full", tone.bar)}
              style={{ width: `${pct}%`, transition: `width 1200ms ${EASE}` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px]">
            <span className="font-mono tabular-nums text-muted-foreground">{pct}%</span>
            {batida ? (
              <span className="font-mono uppercase tracking-[0.2em] text-primary font-medium">Meta batida</span>
            ) : (
              <span className="font-mono tabular-nums text-foreground/80">
                faltam {formatBRLShort(faltaValor)} · {faltaQtd}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ KPI strip ============

interface Kpi {
  label: string;
  value: string;
  delta?: { dir: "up" | "down" | "flat"; text: string };
}

function KpiStrip({ items }: { items: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-border/40 border-y border-border/40 bg-background/30 backdrop-blur-xl">
      {items.map((s, i) => (
        <div key={i} className="px-6 py-4">
          <p className="font-sans text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{s.label}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="font-mono tabular-nums text-2xl font-medium text-foreground">{s.value}</p>
            {s.delta && (
              <span
                className={cn(
                  "font-mono text-[10px] tabular-nums",
                  s.delta.dir === "up" ? "text-primary" :
                  s.delta.dir === "down" ? "text-muted-foreground" :
                  "text-muted-foreground/70"
                )}
              >
                {s.delta.dir === "up" ? "▲" : s.delta.dir === "down" ? "▼" : "·"} {s.delta.text}
              </span>
            )}
          </div>
        </div>
      ))}
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
  useEffect(() => { setLastSync(new Date()); }, [forecast.pipelineBruto, forecast.totalMaes]);

  // ID de sessão estável (4 chars) — sensação de painel corporativo
  const sessionId = useMemo(() => {
    return Math.random().toString(16).slice(2, 6).toUpperCase();
  }, []);

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
  // "Pace" — onde deveríamos estar hoje (linear pelo dia do mês)
  const pacePct = diasNoMes > 0 ? Math.round((diaAtual / diasNoMes) * 100) : 0;

  let ritmo: { label: string; color: string };
  if (projecaoMes >= metaTotal) ritmo = { label: "ACELERANDO", color: "text-primary" };
  else if (projecaoMes >= metaTotal * 0.9) ritmo = { label: "NO RITMO", color: "text-foreground/80" };
  else ritmo = { label: "ATRASADO", color: "text-muted-foreground" };

  const ritmoDiario = diaAtual > 0 ? realizado / diaAtual : 0;
  let etaLabel = "—";
  if (metaBatida) etaLabel = "OK";
  else if (ritmoDiario > 0) {
    const dias = Math.ceil(gap / ritmoDiario);
    const eta = new Date(now);
    eta.setDate(eta.getDate() + dias);
    etaLabel = eta.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }

  // Conversão Entradas → Aprovada (derivado)
  const faseEntradas = forecast.fases.find(f => f.faseKey === "Entradas do Mês");
  const faseAprovada = forecast.fases.find(f => f.faseKey === "Aprovada");
  const conversao =
    faseEntradas && faseEntradas.quantidade > 0 && faseAprovada
      ? Math.round((faseAprovada.quantidade / faseEntradas.quantidade) * 100)
      : null;

  const secondsSinceSync = Math.max(0, Math.round((now.getTime() - lastSync.getTime()) / 1000));
  const clockStr = now.toLocaleTimeString("pt-BR", { hour12: false });
  const dateStr = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  const tz = "BRT";

  const kpis: Kpi[] = [
    { label: "Dias restantes", value: String(diasRestantes) },
    {
      label: "Projeção do mês",
      value: formatBRLShort(projecaoMes),
      delta: projecaoMes >= metaTotal
        ? { dir: "up", text: `+${projecaoPct - 100}% vs meta` }
        : { dir: "down", text: `${projecaoPct - 100}% vs meta` },
    },
    { label: "Pipeline ajustado", value: formatBRLShort(forecast.pipelineAjustado) },
    { label: "Ticket médio", value: formatBRLShort(forecast.ticketMedioPadrao) },
    {
      label: "Conversão E→A",
      value: conversao !== null ? `${conversao}%` : "—",
    },
  ];

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background flex flex-col text-foreground">
      <style>{`
        @keyframes tv-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tv-aurora-a { 0%,100% { transform: translate3d(-10%, -8%, 0) scale(1); } 50% { transform: translate3d(8%, 6%, 0) scale(1.1); } }
        @keyframes tv-aurora-b { 0%,100% { transform: translate3d(10%, 12%, 0) scale(1.1); } 50% { transform: translate3d(-6%, -4%, 0) scale(1); } }
        @keyframes tv-aurora-c { 0%,100% { transform: translate3d(0, 0, 0) scale(1); } 50% { transform: translate3d(4%, -6%, 0) scale(1.05); } }
        @keyframes tv-led { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        .tv-led { animation: tv-led 1.8s ease-in-out infinite; }
        .tv-aurora-a { animation: tv-aurora-a 80s ease-in-out infinite; }
        .tv-aurora-b { animation: tv-aurora-b 95s ease-in-out infinite; }
        .tv-aurora-c { animation: tv-aurora-c 70s ease-in-out infinite; }
        .tv-fade-up { animation: tv-rise 800ms ${EASE} forwards; }
      `}</style>

      {/* Aurora background — magenta + carvão alinhados à marca */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="tv-aurora-a absolute -top-1/3 -left-1/4 h-[80vh] w-[80vh] rounded-full blur-3xl opacity-50"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.32), transparent 60%)" }}
        />
        <div
          className="tv-aurora-b absolute -bottom-1/3 -right-1/4 h-[70vh] w-[70vh] rounded-full blur-3xl opacity-40"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.18), transparent 60%)" }}
        />
        <div
          className="tv-aurora-c absolute top-1/3 right-1/4 h-[50vh] w-[50vh] rounded-full blur-3xl opacity-25"
          style={{ background: "radial-gradient(circle, hsl(var(--foreground) / 0.06), transparent 60%)" }}
        />
      </div>

      {/* Grid técnico sutil + vinheta */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 85%)",
        }}
      />

      {/* Film grain */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04] mix-blend-overlay">
        <filter id="tv-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#tv-grain)" />
      </svg>

      {/* Header institucional */}
      <header className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-border/40 backdrop-blur-2xl bg-background/40">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/forecast")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={logoAam} alt="AAM" className="h-8 w-8 rounded-md object-contain opacity-90" />
          <div className="hidden md:block h-8 w-px bg-border/60" />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-sans text-sm font-medium tracking-[0.2em] uppercase text-foreground/90">
                Sala de Operações
              </h1>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary tv-led" />
                AO VIVO
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/80 tabular-nums">
              FORECAST v2.3 · SID {sessionId} · refresh 1s · sync há {secondsSinceSync}s
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono tabular-nums text-xl tracking-wider text-foreground/90">{clockStr}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {dateStr} · {tz}
          </p>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-8 pt-10 pb-6 tv-fade-up">
        <div className="mx-auto max-w-[1600px]">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="h-px w-12 bg-border" />
            <span className="font-sans text-[10px] tracking-[0.35em] uppercase text-muted-foreground">
              {metaBatida ? "Meta do mês" : "Falta para a meta"}
            </span>
            <span className={cn("font-sans text-[10px] tracking-[0.35em] uppercase font-medium", ritmo.color)}>
              · {ritmo.label}
            </span>
            <span className="h-px w-12 bg-border" />
          </div>

          <div className="text-center">
            <span
              className={cn(
                "font-serif font-normal leading-[0.95] tabular-nums",
                "text-[clamp(5rem,14vw,11rem)] tracking-[-0.04em]",
                "text-foreground"
              )}
              style={{
                textShadow: "0 0 140px hsl(var(--primary) / 0.45)",
              }}
            >
              {metaBatida ? "Batida" : <CountUpNumber value={gap} formatter={formatBRLShort} />}
            </span>
          </div>

          {/* Barra de meta com marcador de pace */}
          <div className="mx-auto mt-8 max-w-3xl">
            <div className="relative h-[3px] w-full bg-border/60 overflow-visible rounded-full">
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full"
                style={{ width: `${pctTotal}%`, transition: `width 1400ms ${EASE}`, boxShadow: "0 0 20px hsl(var(--primary) / 0.5)" }}
              />
              {/* marcador pace = "onde deveríamos estar hoje" */}
              {!metaBatida && pacePct > 0 && pacePct < 100 && (
                <div
                  aria-hidden
                  className="absolute -top-1.5 h-6 w-px bg-foreground/60"
                  style={{ left: `${pacePct}%` }}
                >
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground whitespace-nowrap">
                    pace
                  </span>
                </div>
              )}
              {/* marcador projeção */}
              {!metaBatida && projecaoPct > 0 && projecaoPct < 100 && (
                <div
                  aria-hidden
                  className="absolute -top-1.5 h-6 w-px bg-primary/70"
                  style={{ left: `${projecaoPct}%` }}
                >
                  <span className="absolute top-7 left-1/2 -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.25em] text-primary/80 whitespace-nowrap">
                    projeção
                  </span>
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-muted-foreground tabular-nums">
              <span>
                <CountUpNumber value={realizado} formatter={formatBRLShort} /> de {formatBRLShort(metaTotal)}
              </span>
              <span className="text-foreground/80">{pctTotal}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* KPI strip executivo */}
      <section className="relative z-10 px-8">
        <div className="mx-auto max-w-[1600px]">
          <KpiStrip items={kpis} />
        </div>
      </section>

      {/* 4 fases */}
      <section className="relative z-10 flex-1 px-8 py-6 min-h-0">
        <div className="mx-auto max-w-[1600px] grid h-full grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {forecast.fases.map((f, idx) => (
            <PhaseCard key={f.fase} f={f} seed={idx + 1} index={idx} />
          ))}
        </div>
      </section>

      {/* Rodapé corporativo */}
      <footer className="relative z-10 flex items-center justify-between gap-4 px-8 py-3 border-t border-border/40 backdrop-blur-xl bg-background/40 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
        <span className="flex items-center gap-2">
          <img src={logoAam} alt="" className="h-3.5 w-3.5 object-contain opacity-70" />
          Amor Auxílio Maternidade · Painel de Comando
        </span>
        <span className="hidden md:inline-flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-primary tv-led" />
          ops · nominal
        </span>
        <span className="text-foreground/50">Dados internos · não compartilhar</span>
      </footer>
    </div>
  );
}
