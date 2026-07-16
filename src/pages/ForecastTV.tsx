import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePipelineForecast, type FaseForecast } from "@/hooks/usePipelineForecast";
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logoAam from "@/assets/logo-aam.png";

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const formatBRLShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}k`;
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

// ============ KPI cell (strip do header) ============

function KpiCell({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-sans text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <span className="mt-1 font-mono text-base md:text-lg font-semibold text-foreground tabular-nums leading-tight">
        {value}
      </span>
      {hint && <span className="mt-0.5 font-sans text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

// ============ Phase row (foco em legibilidade, sem gráfico) ============

function PhaseRow({ f, index }: { f: FaseForecast; index: number }) {
  const hasMeta = f.metaQuantidade > 0 || f.metaValor > 0;
  const pct = Math.min(1.2, f.atingimentoPct);
  const pctDisplay = Math.round(pct * 100);

  let tone: "ok" | "warn" | "alert" | "neutral" = "neutral";
  if (hasMeta) {
    if (pct >= 1) tone = "ok";
    else if (pct >= 0.7) tone = "warn";
    else tone = "alert";
  }

  const toneColor = {
    ok: "text-emerald-400",
    warn: "text-amber-400",
    alert: "text-rose-400",
    neutral: "text-muted-foreground",
  }[tone];

  const toneBar = {
    ok: "bg-emerald-500",
    warn: "bg-amber-500",
    alert: "bg-rose-500",
    neutral: "bg-muted-foreground/40",
  }[tone];

  return (
    <div
      className="grid grid-cols-[1fr_auto_auto_auto_120px] items-center gap-4 py-3 border-b border-border/40 last:border-b-0 opacity-0"
      style={{ animation: `tv-rise 600ms ${EASE} forwards`, animationDelay: `${120 + index * 60}ms` }}
    >
      {/* Nome + qtd */}
      <div className="min-w-0">
        <p className="font-sans text-sm font-semibold text-foreground truncate">{f.faseKey}</p>
        <p className="font-mono text-xs text-muted-foreground mt-0.5 tabular-nums">
          {f.quantidade} {f.quantidade === 1 ? "mãe" : "mães"}
          {hasMeta && <span className="text-muted-foreground/70"> / meta {f.metaQuantidade}</span>}
        </p>
      </div>

      {/* Realizado */}
      <div className="text-right">
        <p className="font-sans text-xs uppercase tracking-wider text-muted-foreground">Realizado</p>
        <p className="font-mono text-base font-semibold text-foreground tabular-nums">
          <CountUpNumber value={f.valorBruto} formatter={formatBRLShort} />
        </p>
      </div>

      {/* Meta */}
      <div className="text-right hidden md:block">
        <p className="font-sans text-xs uppercase tracking-wider text-muted-foreground">Meta</p>
        <p className="font-mono text-base text-muted-foreground tabular-nums">
          {hasMeta ? formatBRLShort(f.metaValor) : "—"}
        </p>
      </div>

      {/* Gap */}
      <div className="text-right hidden lg:block min-w-[100px]">
        <p className="font-sans text-xs uppercase tracking-wider text-muted-foreground">Gap</p>
        <p className={cn("font-mono text-base tabular-nums font-semibold", hasMeta ? (f.gapValor > 0 ? "text-rose-400" : "text-emerald-400") : "text-muted-foreground")}>
          {hasMeta ? `${f.gapValor > 0 ? "−" : "+"}${formatBRLShort(Math.abs(f.gapValor))}` : "—"}
        </p>
      </div>

      {/* Barra atingimento */}
      <div className="flex flex-col items-end gap-1.5">
        <span className={cn("font-mono text-sm font-bold tabular-nums", toneColor)}>
          {hasMeta ? `${pctDisplay}%` : "—"}
        </span>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full", toneBar)}
            style={{
              width: `${Math.min(100, hasMeta ? pctDisplay : 0)}%`,
              transition: `width 1000ms ${EASE}`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ============ Side card simples (KPI grande) ============

function FocusCard({
  label,
  value,
  delta,
  deltaLabel,
  tone = "primary",
  delay = 0,
}: {
  label: string;
  value: string;
  delta?: { sign: "up" | "down" | "flat"; text: string };
  deltaLabel?: string;
  tone?: "primary" | "neutral" | "alert";
  delay?: number;
}) {
  const valueColor = {
    primary: "text-primary",
    neutral: "text-foreground",
    alert: "text-rose-400",
  }[tone];

  return (
    <div
      className="rounded-xl border border-border/60 bg-card p-5 opacity-0"
      style={{ animation: `tv-rise 700ms ${EASE} forwards`, animationDelay: `${delay}ms` }}
    >
      <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-3 font-serif text-4xl xl:text-5xl font-bold tabular-nums leading-none", valueColor)}>
        {value}
      </p>
      {delta && (
        <p className="mt-3 flex items-center gap-2 font-mono text-xs">
          {delta.sign === "up" && <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
          {delta.sign === "down" && <TrendingDown className="h-3.5 w-3.5 text-rose-400" />}
          <span className={cn(
            "tabular-nums",
            delta.sign === "up" ? "text-emerald-400" : delta.sign === "down" ? "text-rose-400" : "text-muted-foreground"
          )}>
            {delta.text}
          </span>
          {deltaLabel && <span className="text-muted-foreground uppercase tracking-wider text-xs">{deltaLabel}</span>}
        </p>
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
  useEffect(() => { setLastSync(new Date()); }, [forecast.pipelineBruto, forecast.totalMaes]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Ordena fases por pior atingimento (foco em ação) — DEVE vir antes de qualquer early return
  const fasesOrdenadas = useMemo(() => {
    return [...forecast.fases].sort((a, b) => {
      const aHas = a.metaValor > 0;
      const bHas = b.metaValor > 0;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return a.atingimentoPct - b.atingimentoPct;
    });
  }, [forecast.fases]);

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
  const diasRestantes = Math.max(0, diasNoMes - diaAtual);
  const projecaoMes = diaAtual > 0 ? (realizado / diaAtual) * diasNoMes : 0;
  const projecaoPct = metaTotal > 0 ? Math.round((projecaoMes / metaTotal) * 100) : 0;
  const necessarioDia = diasRestantes > 0 && gap > 0 ? gap / diasRestantes : 0;

  const faseAprovada = forecast.fases.find(f => f.faseKey === "Aprovada");
  const faseEntradas = forecast.fases.find(f => f.faseKey === "Entradas do Mês");
  const faseINSS = forecast.fases.find(f => f.faseKey === "Aguardando Análise INSS");
  const conversao =
    faseEntradas && faseEntradas.quantidade > 0 && faseAprovada
      ? Math.round((faseAprovada.quantidade / faseEntradas.quantidade) * 100)
      : null;

  const clockStr = now.toLocaleTimeString("pt-BR", { hour12: false });
  const dateStr = now.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long" });
  const secondsSinceSync = Math.max(0, Math.round((now.getTime() - lastSync.getTime()) / 1000));

  return (
    <div className="relative min-h-screen w-full bg-background text-foreground flex flex-col">
      <style>{`
        @keyframes tv-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tv-led { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        .tv-led { animation: tv-led 1.8s ease-in-out infinite; }
      `}</style>

      {/* Glow sutil do brand, idêntico ao CRM */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-40 h-[60vh] w-[60vh] rounded-full blur-3xl opacity-30"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.18), transparent 65%)" }}
        />
      </div>

      {/* ============ HEADER ============ */}
      <header className="relative z-10 border-b border-border/60 bg-card/40 backdrop-blur-sm">
        <div className="flex h-16 items-center justify-between px-6 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-4 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/forecast")} className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img src={logoAam} alt="AAM" className="h-9 w-9 rounded-md object-contain" />
            <div className="min-w-0">
              <h1 className="font-sans text-sm font-bold tracking-tight text-foreground">
                Forecast · Sala de Operações
              </h1>
              <p className="font-mono text-xs text-muted-foreground flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary tv-led" />
                AO VIVO · {forecast.totalMaes} mães · sync {secondsSinceSync}s
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-lg font-bold text-foreground leading-none tabular-nums">{clockStr}</p>
            <p className="font-sans text-xs text-muted-foreground mt-1 capitalize">{dateStr}</p>
          </div>
        </div>
      </header>

      {/* ============ HERO: Atingimento da meta ============ */}
      <section className="relative z-10 border-b border-border/60">
        <div className="max-w-[1600px] mx-auto px-6 py-8 grid lg:grid-cols-[1.4fr_1fr] gap-8 items-center">
          {/* Lado esquerdo: número grande + barra ============ */}
          <div className="opacity-0" style={{ animation: `tv-rise 800ms ${EASE} forwards`, animationDelay: "60ms" }}>
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-4 w-4 text-primary" />
              <span className="font-sans text-xs font-bold uppercase tracking-[0.25em] text-primary">
                {metaBatida ? "Meta do mês batida" : "Atingimento da meta"}
              </span>
            </div>

            <div className="flex items-baseline gap-4 flex-wrap">
              <h2 className="font-serif text-6xl md:text-7xl xl:text-8xl font-bold text-foreground tabular-nums leading-none tracking-tight">
                <CountUpNumber value={pctTotal} formatter={(n) => `${Math.round(n)}%`} />
              </h2>
              <div className="flex flex-col">
                <span className="font-mono text-sm text-muted-foreground tabular-nums">
                  {formatBRL(realizado)} <span className="text-muted-foreground/60">de</span> {formatBRL(metaTotal)}
                </span>
                {!metaBatida && gap > 0 && (
                  <span className="font-mono text-sm text-rose-400 tabular-nums mt-1">
                    faltam {formatBRL(gap)}
                  </span>
                )}
              </div>
            </div>

            {/* Barra de progresso principal */}
            <div className="mt-6">
              <div className="relative h-3 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-primary rounded-full"
                  style={{
                    width: `${Math.min(100, pctTotal)}%`,
                    transition: `width 1200ms ${EASE}`,
                    boxShadow: "0 0 20px hsl(var(--primary) / 0.5)",
                  }}
                />
                {/* marcador "ritmo ideal" baseado no dia do mês */}
                {metaTotal > 0 && (
                  <div
                    className="absolute inset-y-0 w-0.5 bg-foreground/60"
                    style={{ left: `${Math.min(100, (diaAtual / diasNoMes) * 100)}%` }}
                    title="Ritmo ideal (dia atual / dias do mês)"
                  />
                )}
              </div>
              <div className="mt-2 flex justify-between font-mono text-xs uppercase tracking-wider text-muted-foreground">
                <span>0</span>
                <span>Ritmo ideal: {Math.round((diaAtual / diasNoMes) * 100)}%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Lado direito: 4 KPIs verticais bem legíveis */}
          <div className="grid grid-cols-2 gap-3">
            <FocusCard
              label="Projeção do mês"
              value={`${projecaoPct}%`}
              delta={{
                sign: projecaoPct >= 100 ? "up" : "down",
                text: projecaoPct >= 100 ? "Acima da meta" : "Abaixo da meta",
              }}
              tone={projecaoPct >= 100 ? "primary" : "alert"}
              delay={120}
            />
            <FocusCard
              label="Necessário / dia"
              value={necessarioDia > 0 ? formatBRLShort(necessarioDia) : "—"}
              deltaLabel={diasRestantes > 0 ? `${diasRestantes} dias restantes` : "Último dia"}
              tone="neutral"
              delay={180}
            />
            <FocusCard
              label="Aprovações"
              value={faseAprovada ? formatBRLShort(faseAprovada.valorBruto) : "—"}
              deltaLabel={faseAprovada ? `${faseAprovada.quantidade} mães` : ""}
              tone="primary"
              delay={240}
            />
            <FocusCard
              label="Conversão E→A"
              value={conversao !== null ? `${conversao}%` : "—"}
              deltaLabel="Entradas → Aprovadas"
              tone="neutral"
              delay={300}
            />
          </div>
        </div>
      </section>

      {/* ============ BREAKDOWN POR FASE ============ */}
      <section className="relative z-10 flex-1">
        <div className="max-w-[1600px] mx-auto px-6 py-8 grid lg:grid-cols-[2fr_1fr] gap-6 items-start">
          {/* Tabela de fases (foco principal) */}
          <div className="rounded-xl border border-border/60 bg-card opacity-0"
            style={{ animation: `tv-rise 700ms ${EASE} forwards`, animationDelay: "100ms" }}
          >
            <div className="flex items-center justify-between p-5 border-b border-border/60">
              <div>
                <h3 className="font-sans text-base font-bold tracking-tight text-foreground">Breakdown por fase</h3>
                <p className="font-sans text-xs text-muted-foreground mt-0.5">
                  Ordenado pela maior distância até a meta
                </p>
              </div>
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {forecast.fases.length} fases
              </span>
            </div>
            <div className="px-5">
              {fasesOrdenadas.map((f, i) => (
                <PhaseRow key={f.fase} f={f} index={i} />
              ))}
            </div>
          </div>

          {/* Coluna direita: ações + alertas */}
          <div className="flex flex-col gap-4">
            {/* Resumo executivo */}
            <div
              className="rounded-xl border border-border/60 bg-card p-5 opacity-0"
              style={{ animation: `tv-rise 700ms ${EASE} forwards`, animationDelay: "200ms" }}
            >
              <h3 className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4">
                Resumo executivo
              </h3>
              <div className="space-y-3">
                <KpiCell label="Pipeline bruto" value={formatBRL(forecast.pipelineBruto)} />
                <KpiCell label="Pipeline ajustado" value={formatBRL(forecast.pipelineAjustado)} hint="Ponderado por probabilidade" />
                <KpiCell label="Curto prazo" value={formatBRL(forecast.curtoPrazo)} hint="INSS + Aprovadas" />
                <KpiCell label="Ticket médio" value={formatBRL(forecast.ticketMedioPadrao)} />
              </div>
            </div>

            {/* Alertas (textuais, sem gráfico) */}
            <div
              className="rounded-xl border border-border/60 bg-card p-5 opacity-0"
              style={{ animation: `tv-rise 700ms ${EASE} forwards`, animationDelay: "280ms" }}
            >
              <h3 className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-primary mb-4">
                Alertas
              </h3>
              <div className="space-y-3">
                {faseINSS && faseINSS.quantidade > 0 && (
                  <div className="flex gap-3 items-start p-3 rounded-lg bg-rose-500/10 border border-rose-500/30">
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-sans text-sm font-semibold text-foreground">
                        {faseINSS.quantidade} {faseINSS.quantidade === 1 ? "mãe aguarda" : "mães aguardam"} INSS
                      </p>
                      <p className="font-sans text-xs text-muted-foreground mt-0.5">
                        Acompanhar prazo de análise · {formatBRLShort(faseINSS.valorBruto)} em jogo
                      </p>
                    </div>
                  </div>
                )}
                {!metaBatida && projecaoPct < 90 && (
                  <div className="flex gap-3 items-start p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <TrendingDown className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-sans text-sm font-semibold text-foreground">Projeção abaixo da meta</p>
                      <p className="font-sans text-xs text-muted-foreground mt-0.5">
                        No ritmo atual o mês fecha em {projecaoPct}% · acelerar entradas
                      </p>
                    </div>
                  </div>
                )}
                {metaBatida && (
                  <div className="flex gap-3 items-start p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-sans text-sm font-semibold text-foreground">Meta do mês alcançada</p>
                      <p className="font-sans text-xs text-muted-foreground mt-0.5">
                        Foco em ampliar o resultado e antecipar entradas do próximo ciclo
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="relative z-10 border-t border-border/60 bg-card/40">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex justify-between items-center font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-primary tv-led" />
            <span className="text-primary font-semibold">Status nominal</span>
          </span>
          <span className="hidden md:inline">Amor Auxílio Maternidade · Painel estratégico · Dados confidenciais</span>
        </div>
      </footer>
    </div>
  );
}
