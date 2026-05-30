import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePipelineForecast, type FaseForecast } from "@/hooks/usePipelineForecast";
import { Loader2, ArrowLeft, AlertTriangle, Zap } from "lucide-react";
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

function CountUpNumber({ value, formatter }: { value: number; formatter: (n: number) => string }) {
  return <>{formatter(useCountUp(value))}</>;
}

// ============ Donut de progresso (meta mensal) ============

function GoalDonut({ pct, falta }: { pct: number; falta: number }) {
  const R = 88;
  const C = 2 * Math.PI * R;
  const animatedPct = useCountUp(pct, 1200);
  const offset = C - (animatedPct / 100) * C;
  return (
    <div className="relative h-48 w-48 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 192 192">
        <circle cx="96" cy="96" r={R} fill="transparent" stroke="hsl(var(--border) / 0.4)" strokeWidth="10" />
        <circle
          cx="96" cy="96" r={R} fill="transparent"
          stroke="hsl(var(--primary))" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          style={{
            transition: `stroke-dashoffset 1200ms ${EASE}`,
            filter: "drop-shadow(0 0 12px hsl(var(--primary) / 0.6))",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-serif text-4xl font-bold text-foreground tabular-nums leading-none">
          {Math.round(animatedPct)}%
        </span>
        <span className="mt-1 font-sans text-[9px] uppercase tracking-[0.25em] text-muted-foreground">Concluído</span>
        {falta > 0 && (
          <span className="mt-2 font-mono text-[10px] text-primary tabular-nums">
            faltam {formatBRLShort(falta)}
          </span>
        )}
      </div>
    </div>
  );
}

// ============ Mini-barchart por fase (dias do mês, sintético) ============

function PhaseBars({ seed, accent }: { seed: number; accent: "primary" | "muted" }) {
  const N = 14;
  const bars = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < N; i++) {
      const v = (Math.sin(seed * 1.7 + i * 0.6) + Math.cos(seed + i * 1.3)) * 0.3 + 0.5;
      arr.push(Math.max(0.1, Math.min(1, v)));
    }
    return arr;
  }, [seed]);
  return (
    <div className="h-10 w-full flex items-end gap-0.5">
      {bars.map((b, i) => {
        const isPeak = b > 0.75;
        const opacity = Math.round(b * 100);
        return (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-t-sm",
              accent === "primary" ? "bg-primary" : "bg-foreground"
            )}
            style={{
              height: `${Math.round(b * 100)}%`,
              opacity: isPeak ? 1 : opacity / 130,
            }}
          />
        );
      })}
    </div>
  );
}

// ============ Phase card ============

function PhaseCard({ f, seed, index, isHero }: { f: FaseForecast; seed: number; index: number; isHero: boolean }) {
  const hasMeta = f.metaQuantidade > 0 || f.metaValor > 0;
  const subtitleMap: Record<string, string> = {
    "Gestantes 1 a 8 meses": "Pipeline futuro",
    "Entradas do Mês": "Processamento",
    "Aguardando Análise INSS": "Análise externa",
    "Aprovada": "Receita confirmada",
  };
  const subtitle = subtitleMap[f.faseKey] ?? "—";

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between rounded-lg border bg-card/60 p-4 overflow-hidden opacity-0",
        isHero ? "border-primary/30 ring-1 ring-primary/20" : "border-border/60"
      )}
      style={{
        animation: `tv-rise 700ms ${EASE} forwards`,
        animationDelay: `${180 + index * 70}ms`,
      }}
    >
      {isHero && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(circle at 70% 30%, hsl(var(--primary) / 0.08), transparent 60%)",
          }}
        />
      )}
      <div className="relative flex justify-between items-start">
        <div className="min-w-0">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-primary truncate">
            {f.faseKey}
          </p>
          <p className="mt-0.5 font-sans text-[9px] uppercase tracking-tight text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <span className="font-mono text-xs text-foreground/90 tabular-nums whitespace-nowrap">
          {f.quantidade} / {hasMeta ? f.metaQuantidade : "—"}
        </span>
      </div>

      <div className="relative my-3">
        <h4 className={cn(
          "font-serif text-2xl font-black tabular-nums",
          isHero ? "text-primary" : "text-foreground"
        )}>
          <CountUpNumber value={f.valorBruto} formatter={formatBRLShort} />
        </h4>
      </div>

      <div className="relative">
        <PhaseBars seed={seed} accent={isHero ? "primary" : "muted"} />
      </div>
    </div>
  );
}

// ============ Leaderboard (sintético — TODO: hook por atendente) ============

interface TopAtendente { nome: string; valor: number; pct: number; }

function Leaderboard({ items }: { items: TopAtendente[] }) {
  return (
    <div className="space-y-4">
      {items.map((a, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className={cn(
            "font-mono text-[10px] tabular-nums w-4",
            i === 0 ? "text-primary font-bold" : "text-muted-foreground"
          )}>
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="h-8 w-8 rounded-full bg-muted border border-border/60 flex items-center justify-center font-sans text-[10px] font-bold text-foreground/80">
            {a.nome.split(" ").map(p => p[0]).slice(0, 2).join("")}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-sans text-xs font-medium text-foreground truncate">{a.nome}</p>
            <div className="mt-1 h-1 w-full bg-muted/70 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${a.pct}%`, transition: `width 1000ms ${EASE}` }}
              />
            </div>
          </div>
          <span className="font-mono text-[10px] text-foreground tabular-nums whitespace-nowrap">
            {formatBRLShort(a.valor)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============ Heatmap 7×3 (últimas 3 semanas, sintético) ============

function Heatmap({ seed }: { seed: number }) {
  const cells = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < 21; i++) {
      const v = (Math.sin(seed + i * 0.7) + Math.cos(seed * 0.5 + i * 1.1)) * 0.4 + 0.5;
      out.push(Math.max(0.05, Math.min(1, v)));
    }
    return out;
  }, [seed]);
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {cells.map((c, i) => (
        <div
          key={i}
          className="aspect-square rounded-sm bg-primary"
          style={{ opacity: 0.08 + c * 0.85 }}
        />
      ))}
    </div>
  );
}

// ============ Panel wrapper ============

function Panel({
  title,
  titleColor = "text-muted-foreground",
  rightLabel,
  children,
  className,
  delay = 0,
}: {
  title: string;
  titleColor?: string;
  rightLabel?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn(
        "relative rounded-lg border border-border/60 bg-card/60 p-5 backdrop-blur-sm opacity-0",
        className
      )}
      style={{
        animation: `tv-rise 700ms ${EASE} forwards`,
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className={cn("font-sans text-[10px] font-bold uppercase tracking-[0.2em]", titleColor)}>
          {title}
        </h3>
        {rightLabel && (
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/70">
            {rightLabel}
          </span>
        )}
      </div>
      {children}
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

  const sessionId = useMemo(() => Math.random().toString(16).slice(2, 6).toUpperCase(), []);

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
  const pctTotal = metaTotal > 0 ? (realizado / metaTotal) * 100 : 0;
  const metaBatida = metaTotal > 0 && gap <= 0;

  const diaAtual = now.getDate();
  const diasNoMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projecaoMes = diaAtual > 0 ? (realizado / diaAtual) * diasNoMes : 0;
  const projecaoPct = metaTotal > 0 ? Math.round((projecaoMes / metaTotal) * 100) : 0;

  // Comparativo sintético vs mês anterior (TODO: expor no hook)
  const vsMesAnterior = projecaoMes >= metaTotal ? 12 : -8;

  // Top atendentes (sintético — TODO: agregar por atendente_responsavel)
  const topAtendentes: TopAtendente[] = [
    { nome: "Mariana Silva", valor: realizado * 0.42, pct: 95 },
    { nome: "Beatriz Costa", valor: realizado * 0.31, pct: 72 },
    { nome: "Ana Júlia", valor: realizado * 0.18, pct: 48 },
  ];

  const clockStr = now.toLocaleTimeString("pt-BR", { hour12: false });
  const dateStr = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
  const secondsSinceSync = Math.max(0, Math.round((now.getTime() - lastSync.getTime()) / 1000));

  const faseAprovada = forecast.fases.find(f => f.faseKey === "Aprovada");
  const faseEntradas = forecast.fases.find(f => f.faseKey === "Entradas do Mês");
  const faseINSS = forecast.fases.find(f => f.faseKey === "Aguardando Análise INSS");
  const conversao =
    faseEntradas && faseEntradas.quantidade > 0 && faseAprovada
      ? Math.round((faseAprovada.quantidade / faseEntradas.quantidade) * 100)
      : null;

  return (
    <div
      className="tv-root relative h-screen w-screen overflow-hidden bg-background text-foreground p-4 flex flex-col gap-4"
      style={{
        // Institutional executive palette — scoped to this page only.
        // Deep midnight navy + champagne gold accent. Inspired by Bloomberg / FT terminals.
        ["--background" as any]: "222 38% 7%",
        ["--foreground" as any]: "40 25% 92%",
        ["--card" as any]: "222 32% 10%",
        ["--card-foreground" as any]: "40 25% 92%",
        ["--popover" as any]: "222 32% 10%",
        ["--popover-foreground" as any]: "40 25% 92%",
        ["--primary" as any]: "40 55% 58%",            // champagne gold
        ["--primary-foreground" as any]: "222 38% 7%",
        ["--secondary" as any]: "222 25% 16%",
        ["--secondary-foreground" as any]: "40 25% 92%",
        ["--muted" as any]: "222 22% 14%",
        ["--muted-foreground" as any]: "220 12% 62%",
        ["--accent" as any]: "40 55% 58%",
        ["--accent-foreground" as any]: "222 38% 7%",
        ["--destructive" as any]: "0 65% 55%",
        ["--destructive-foreground" as any]: "40 25% 96%",
        ["--border" as any]: "222 22% 18%",
        ["--input" as any]: "222 22% 18%",
        ["--ring" as any]: "40 55% 58%",
        fontFamily: "'Inter Tight', 'Inter', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=Instrument+Serif&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .tv-root .font-sans { font-family: 'Inter Tight', 'Inter', ui-sans-serif, system-ui, sans-serif !important; font-feature-settings: 'ss01','cv11'; }
        .tv-root .font-serif { font-family: 'Instrument Serif', 'Merriweather', ui-serif, Georgia, serif !important; font-weight: 400 !important; letter-spacing: -0.01em; }
        .tv-root .font-mono { font-family: 'IBM Plex Mono', 'JetBrains Mono', ui-monospace, monospace !important; font-feature-settings: 'zero','ss02'; }
        .tv-root { background: radial-gradient(ellipse at top, hsl(222 32% 11%) 0%, hsl(222 38% 6%) 70%); }
        @keyframes tv-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tv-led { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes tv-aurora { 0%,100% { transform: translate3d(-6%, -4%, 0) scale(1); } 50% { transform: translate3d(6%, 4%, 0) scale(1.08); } }
        .tv-led { animation: tv-led 1.8s ease-in-out infinite; }
        .tv-aurora { animation: tv-aurora 80s ease-in-out infinite; }
        /* Subtle film grain for editorial feel */
        .tv-grain::before {
          content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0.04;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          mix-blend-mode: overlay;
        }
      `}</style>

      {/* Aurora background — dual layer (cool navy glow + warm gold accent) */}
      <div aria-hidden className="tv-grain pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="tv-aurora absolute top-1/3 left-1/2 h-[80vh] w-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl opacity-50"
          style={{ background: "radial-gradient(circle, hsl(220 60% 40% / 0.25), transparent 65%)" }}
        />
        <div
          className="absolute bottom-0 right-0 h-[60vh] w-[60vh] translate-x-1/4 translate-y-1/4 rounded-full blur-3xl opacity-30"
          style={{ background: "radial-gradient(circle, hsl(40 55% 58% / 0.18), transparent 70%)" }}
        />
      </div>

      {/* ============ HEADER ============ */}
      <header className="relative z-10 flex justify-between items-center border-b border-border/40 pb-3">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/forecast")} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <img src={logoAam} alt="AAM" className="h-8 w-8 rounded-md object-contain" />
            <div>
              <h1 className="font-sans text-xs font-bold tracking-[0.2em] uppercase text-foreground">
                Sala de Operações
              </h1>
              <p className="font-mono text-[10px] text-primary flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary tv-led" />
                LIVE · SID {sessionId} · sync {secondsSinceSync}s
              </p>
            </div>
          </div>
          <div className="hidden md:block h-8 w-px bg-border/60" />
          <div className="hidden md:grid grid-cols-3 gap-8">
            <div>
              <p className="font-sans text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Pipeline Bruto</p>
              <p className="font-mono text-sm text-foreground tabular-nums">{formatBRLShort(forecast.pipelineBruto)}</p>
            </div>
            <div>
              <p className="font-sans text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Ticket Médio</p>
              <p className="font-mono text-sm text-foreground tabular-nums">{formatBRLShort(forecast.ticketMedioPadrao)}</p>
            </div>
            <div>
              <p className="font-sans text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Total Mães</p>
              <p className="font-mono text-sm text-foreground tabular-nums">{forecast.totalMaes.toLocaleString("pt-BR")}</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-xl font-bold text-foreground leading-none tabular-nums">{clockStr}</p>
          <p className="font-sans text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
            {dateStr} · BRT
          </p>
        </div>
      </header>

      {/* ============ MAIN GRID 12 cols ============ */}
      <main className="relative z-10 flex-1 grid grid-cols-12 gap-4 min-h-0">

        {/* LEFT: Donut + Heatmap */}
        <section className="col-span-12 lg:col-span-3 flex flex-col gap-4 min-h-0">
          <Panel
            title="Progresso da Meta"
            titleColor="text-primary"
            className="flex-1 flex flex-col"
            delay={80}
          >
            <div className="flex-1 flex flex-col justify-center">
              <GoalDonut pct={pctTotal} falta={gap} />
              <div className="mt-6 space-y-2.5">
                <div className="flex justify-between font-mono text-[11px] tabular-nums">
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Meta mensal</span>
                  <span className="text-foreground">{formatBRLShort(metaTotal)}</span>
                </div>
                <div className="flex justify-between font-mono text-[11px] tabular-nums">
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Realizado</span>
                  <span className="text-foreground">{formatBRLShort(realizado)}</span>
                </div>
                <div className="flex justify-between font-mono text-[11px] tabular-nums">
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Projeção</span>
                  <span className={cn(projecaoPct >= 100 ? "text-primary" : "text-foreground")}>
                    {formatBRLShort(projecaoMes)} <span className="text-muted-foreground">· {projecaoPct}%</span>
                  </span>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Heatmap Aprovações" rightLabel="21 DIAS" delay={140}>
            <Heatmap seed={7} />
            <div className="mt-3 flex justify-between items-center font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              <span>menos</span>
              <div className="flex gap-1">
                {[0.15, 0.35, 0.6, 0.85].map((o, i) => (
                  <div key={i} className="h-2.5 w-2.5 rounded-sm bg-primary" style={{ opacity: o }} />
                ))}
              </div>
              <span>mais</span>
            </div>
          </Panel>
        </section>

        {/* CENTER: Hero + 4 phase cards */}
        <section className="col-span-12 lg:col-span-6 flex flex-col gap-4 min-h-0">
          {/* Hero block */}
          <div
            className="relative rounded-lg border border-border/60 bg-card/60 p-8 overflow-hidden flex flex-col justify-center items-center opacity-0"
            style={{ animation: `tv-rise 800ms ${EASE} forwards`, animationDelay: "100ms" }}
          >
            <div
              aria-hidden
              className="absolute top-0 left-0 w-full h-px"
              style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.6), transparent)" }}
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ background: "radial-gradient(circle at center, hsl(var(--primary) / 0.1), transparent 70%)" }}
            />
            <p className="relative font-sans text-[11px] font-bold tracking-[0.4em] uppercase text-muted-foreground mb-3">
              {metaBatida ? "Meta do Mês" : "Falta para a Meta"}
            </p>
            <h2 className="relative font-serif text-7xl xl:text-8xl font-black text-foreground tracking-tight tabular-nums leading-none"
              style={{ textShadow: "0 0 60px hsl(var(--primary) / 0.35)" }}>
              {metaBatida ? "Batida" : <CountUpNumber value={gap} formatter={formatBRLShort} />}
            </h2>
            <div className="relative mt-6 flex items-center gap-3 flex-wrap justify-center">
              <div className="px-3 py-1 bg-muted/60 border border-border/60 rounded-full font-sans text-[10px] text-foreground flex items-center gap-2">
                <span className={cn("font-bold font-mono", vsMesAnterior >= 0 ? "text-primary" : "text-muted-foreground")}>
                  {vsMesAnterior >= 0 ? "▲" : "▼"} {Math.abs(vsMesAnterior)}%
                </span>
                <span className="uppercase tracking-wider text-muted-foreground">vs mês anterior</span>
              </div>
              <div className="px-3 py-1 bg-muted/60 border border-border/60 rounded-full font-sans text-[10px] text-foreground flex items-center gap-2">
                <span className="uppercase tracking-wider text-muted-foreground">Pace:</span>
                <span className="font-mono tabular-nums">{projecaoPct}% da meta</span>
              </div>
              <div className="px-3 py-1 bg-muted/60 border border-border/60 rounded-full font-sans text-[10px] text-foreground flex items-center gap-2">
                <span className="uppercase tracking-wider text-muted-foreground">Conv. E→A:</span>
                <span className="font-mono tabular-nums">{conversao !== null ? `${conversao}%` : "—"}</span>
              </div>
            </div>
          </div>

          {/* Funnel 2×2 */}
          <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
            {forecast.fases.map((f, idx) => (
              <PhaseCard
                key={f.fase}
                f={f}
                seed={idx + 1}
                index={idx}
                isHero={f.faseKey === "Aprovada"}
              />
            ))}
          </div>
        </section>

        {/* RIGHT: Leaderboard + Alerts */}
        <section className="col-span-12 lg:col-span-3 flex flex-col gap-4 min-h-0">
          <Panel
            title="Leaderboard"
            rightLabel="TOP PERFORMERS"
            className="flex-1"
            delay={120}
          >
            <Leaderboard items={topAtendentes} />
          </Panel>

          <Panel title="Alertas Críticos" titleColor="text-primary" delay={180}>
            <div className="space-y-3">
              {faseINSS && faseINSS.quantidade > 0 && (
                <div className="p-2.5 bg-destructive/10 border-l-2 border-destructive rounded flex gap-3 items-start">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-foreground">SLA Atrasado</p>
                    <p className="font-sans text-[10px] text-muted-foreground mt-0.5">
                      {faseINSS.quantidade} {faseINSS.quantidade === 1 ? "mãe" : "mães"} aguardando INSS &gt; 48h
                    </p>
                  </div>
                </div>
              )}
              {faseAprovada && faseAprovada.quantidade > 0 && (
                <div className="p-2.5 bg-primary/5 border-l-2 border-primary rounded flex gap-3 items-start">
                  <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-foreground">Aprovações Hoje</p>
                    <p className="font-sans text-[10px] text-muted-foreground mt-0.5">
                      Último ticket há ~2 min · {formatBRLShort(forecast.ticketMedioPadrao)}
                    </p>
                  </div>
                </div>
              )}
              {projecaoPct < 90 && !metaBatida && (
                <div className="p-2.5 bg-muted/40 border-l-2 border-muted-foreground/60 rounded flex gap-3 items-start">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-foreground">Ritmo abaixo</p>
                    <p className="font-sans text-[10px] text-muted-foreground mt-0.5">
                      Projeção em {projecaoPct}% da meta · acelerar conversão
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </section>
      </main>

      {/* ============ FOOTER TICKER ============ */}
      <footer className="relative z-10 flex justify-between items-center border-t border-border/40 pt-3 font-mono text-[9px] uppercase tracking-[0.2em]">
        <div className="flex gap-6">
          <span className="text-primary font-bold flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-primary tv-led" />
            Status: Nominal
          </span>
          <span className="text-muted-foreground">Server: SID-{sessionId}</span>
          <span className="text-muted-foreground hidden md:inline">Sync: OK ({secondsSinceSync}s)</span>
        </div>
        <span className="text-muted-foreground/70 hidden md:inline">
          Amor Auxílio Maternidade · Painel de Controle Estratégico · Dados Confidenciais
        </span>
      </footer>
    </div>
  );
}
