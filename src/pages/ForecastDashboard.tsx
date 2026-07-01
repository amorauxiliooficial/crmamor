import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useExecutiveForecast } from "@/hooks/useExecutiveForecast";
import { usePagamentos } from "@/hooks/usePagamentos";
import { useDespesas } from "@/hooks/useDespesas";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  Settings2,
  Monitor,
  LayoutDashboard,
  LineChart,
  GitBranch,
  Wallet,
  Target,
  Inbox,
  CalendarClock,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { FaseDrillDownSheet } from "@/components/forecast/FaseDrillDownSheet";
import { MetasFaseConfigDialog } from "@/components/forecast/MetasFaseConfigDialog";
import { ExecutiveKpis, type KpiId } from "@/components/forecast/ExecutiveKpis";
import { ForecastChart } from "@/components/forecast/ForecastChart";
import { ExecutivePipelineTable } from "@/components/forecast/ExecutivePipelineTable";
import { CarteiraDonutCard, type CarteiraSegmentId } from "@/components/forecast/CarteiraDonutCard";
import { BaterMetaCard } from "@/components/forecast/BaterMetaCard";
import { RecebimentosPanels } from "@/components/forecast/RecebimentosPanels";
import { InsightsPanel, type InsightItem } from "@/components/forecast/InsightsPanel";
import { MetaFinanceiraDialog } from "@/components/forecast/MetaFinanceiraDialog";
import { MetricDrillSheet, type DrillSpec } from "@/components/forecast/MetricDrillSheet";
import { buildCarteiraSpec, buildForecastMonthSpec, buildKpiSpec } from "@/components/forecast/buildDrillSpec";
import type { FaseForecast } from "@/hooks/usePipelineForecast";
import type { ForecastMesItem } from "@/hooks/useExecutiveForecast";

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const formatBRLShort = (n: number) => {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(1)}k`;
  return formatBRL(n);
};

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(2026, i, 1), "MMMM", { locale: ptBR }),
}));

const NAV_SECTIONS = [
  { id: "resumo", label: "Resumo Executivo", icon: LayoutDashboard, hint: "KPIs do mês" },
  { id: "forecast", label: "Forecast Financeiro", icon: LineChart, hint: "Próximos 6 meses" },
  { id: "pipeline", label: "Pipeline Operacional", icon: GitBranch, hint: "Funil de etapas" },
  { id: "carteira", label: "Carteira Financeira", icon: Wallet, hint: "Contratado vs recebido" },
  { id: "meta", label: "Como bater a meta", icon: Target, hint: "Composição sugerida" },
  { id: "entradas", label: "Entradas & Recebimentos", icon: Inbox, hint: "Histórico + agenda" },
  { id: "insights", label: "Insights Inteligentes", icon: Lightbulb, hint: "Análises automáticas" },
];

const TONE_FROM_HOOK: Record<string, InsightItem["tone"]> = {
  positivo: "positive",
  alerta: "warning",
  risco: "negative",
  info: "info",
};

const ICON_FROM_HOOK: Record<string, InsightItem["icon"]> = {
  positivo: TrendingUp,
  alerta: AlertTriangle,
  risco: TrendingDown,
  info: Sparkles,
};

export default function ForecastDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();

  const today = new Date();
  const [mes, setMes] = useState(today.getMonth());
  const [ano, setAno] = useState(today.getFullYear());
  const refDate = useMemo(() => new Date(ano, mes, 1), [mes, ano]);
  const executivo = useExecutiveForecast(refDate);
  const { pagamentos } = usePagamentos();
  const { despesas } = useDespesas();

  const yearOptions = useMemo(() => {
    const y = today.getFullYear();
    return [y - 1, y, y + 1];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedFase, setSelectedFase] = useState<FaseForecast | null>(null);
  const [drillOpen, setDrillOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [metaFinOpen, setMetaFinOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("resumo");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [metricSpec, setMetricSpec] = useState<DrillSpec | null>(null);
  const [metricOpen, setMetricOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const ctx = useMemo(
    () => ({
      refDate,
      pagamentos,
      despesas,
      kpis: executivo.kpis,
      carteira: executivo.carteira,
      formatBRL,
    }),
    [refDate, pagamentos, despesas, executivo.kpis, executivo.carteira],
  );

  const openMetric = (spec: DrillSpec) => {
    setMetricSpec(spec);
    setMetricOpen(true);
  };
  const handleKpiClick = (id: KpiId) => openMetric(buildKpiSpec(id, ctx));
  const handleMonthClick = (m: ForecastMesItem) => openMetric(buildForecastMonthSpec(m, ctx));
  const handleCarteiraClick = (id: CarteiraSegmentId) => openMetric(buildCarteiraSpec(id, ctx));

  const handleFaseClick = (f: FaseForecast) => {
    setSelectedFase(f);
    setDrillOpen(true);
  };

  const insightsMapped: InsightItem[] = useMemo(
    () =>
      (executivo.insights ?? []).map((i) => ({
        id: i.id,
        text: `${i.titulo} — ${i.descricao}`,
        tone: TONE_FROM_HOOK[i.tipo] ?? "info",
        icon: ICON_FROM_HOOK[i.tipo],
      })),
    [executivo.insights],
  );

  const scrollTo = (id: string) => {
    setActiveSection(id);
    setMobileNavOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (authLoading || executivo.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        {/* ===== SIDEBAR ===== */}
        <aside
          className={cn(
            "fixed lg:sticky top-0 z-50 h-screen w-72 shrink-0 flex flex-col border-r border-border/60 bg-sidebar transition-transform lg:translate-x-0",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="px-5 py-5 border-b border-border/60">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar ao CRM
              </button>
              <button
                className="lg:hidden text-muted-foreground hover:text-foreground"
                onClick={() => setMobileNavOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary grid place-items-center text-primary-foreground shadow-lg shadow-primary/25">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold tracking-tight">Central de</h1>
                <p className="text-sm font-bold text-primary -mt-0.5">Performance</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Navegação
            </div>
            {NAV_SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={cn(
                    "group w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/70 hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 mt-0.5 shrink-0",
                      active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-medium leading-tight">{s.label}</span>
                    <span
                      className={cn(
                        "block text-[10px] mt-0.5",
                        active ? "text-primary/70" : "text-muted-foreground",
                      )}
                    >
                      {s.hint}
                    </span>
                  </span>
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />}
                </button>
              );
            })}
          </nav>

          <div className="px-4 py-4 border-t border-border/60 space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => navigate("/forecast/tv")}
            >
              <Monitor className="h-4 w-4 mr-2" />
              Modo TV
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => setConfigOpen(true)}
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Configurar Metas
              </Button>
            )}
          </div>
        </aside>

        {/* overlay mobile */}
        {mobileNavOpen && (
          <div
            className="fixed inset-0 z-40 bg-foreground/30 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        {/* ===== CONTEÚDO ===== */}
        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-8">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setMobileNavOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base md:text-lg font-bold tracking-tight truncate">
                      Central de Performance
                    </h2>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </span>
                      AO VIVO
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground capitalize">
                    {format(refDate, "MMMM 'de' yyyy", { locale: ptBR })} · clique em qualquer KPI ou
                    barra para ver a origem dos dados
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                  <SelectTrigger className="h-9 w-[130px] text-xs capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {MONTH_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={String(m.value)} className="capitalize text-xs">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
                  <SelectTrigger className="h-9 w-[90px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)} className="text-xs">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </header>

          <main className="px-4 md:px-8 py-6 md:py-8 space-y-8 max-w-[1400px] mx-auto">
            <Section id="resumo" label="Resumo Executivo" sub="Clique num card para ver os registros">
              <ExecutiveKpis kpis={executivo.kpis} formatBRL={formatBRL} onCardClick={handleKpiClick} />
            </Section>

            <Section id="forecast" label="Forecast Financeiro" sub="Receita prevista por mês — clique numa barra para detalhar">
              <ForecastChart
                data={executivo.forecast6m}
                metaMes={executivo.kpis.metaMes}
                formatBRL={formatBRL}
                formatBRLShort={formatBRLShort}
                onMonthClick={handleMonthClick}
              />
            </Section>

            <Section id="pipeline" label="Pipeline Operacional" sub="Saúde de cada etapa do funil">
              <ExecutivePipelineTable
                fases={executivo.pipelineOperacional.fases}
                onFaseClick={handleFaseClick}
                formatBRLShort={formatBRLShort}
              />
            </Section>

            <Section id="carteira" label="Carteira Financeira" sub="Clique num segmento para ver a composição">
              <CarteiraDonutCard
                carteira={executivo.carteira}
                formatBRL={formatBRL}
                onSegmentClick={handleCarteiraClick}
              />
            </Section>

            <Section id="meta" label="Como bater a meta" sub="Composição sugerida para o gap">
              <BaterMetaCard
                composicao={executivo.composicao}
                metaMes={executivo.kpis.metaMes}
                receitaPrevista={executivo.receitaPrevistaMes}
                receitaRecebida={executivo.receitaRecebidaMes}
                formatBRL={formatBRL}
                onEditMeta={() => setConfigOpen(true)}
                canEdit={isAdmin}
              />
            </Section>

            <Section id="entradas" label="Entradas & Recebimentos" sub="Histórico recente e agenda de cobrança">
              <RecebimentosPanels
                ultimas={executivo.ultimasEntradas}
                proximos={executivo.proximosRecebimentos}
                formatBRL={formatBRL}
              />
            </Section>

            <Section id="insights" label="Insights Inteligentes" sub="Análises automáticas sobre seus dados">
              <InsightsPanel insights={insightsMapped} />
            </Section>
          </main>
        </div>
      </div>

      <FaseDrillDownSheet
        fase={selectedFase}
        open={drillOpen}
        onOpenChange={setDrillOpen}
        formatBRL={formatBRL}
        formatBRLShort={formatBRLShort}
      />

      <MetricDrillSheet
        spec={metricSpec}
        open={metricOpen}
        onOpenChange={setMetricOpen}
        formatBRL={formatBRL}
      />

      <MetasFaseConfigDialog open={configOpen} onOpenChange={setConfigOpen} />
      <MetaFinanceiraDialog open={metaFinOpen} onOpenChange={setMetaFinOpen} />
    </div>
  );
}

function Section({
  id,
  label,
  sub,
  children,
}: {
  id: string;
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-3 scroll-mt-20">
      <div className="px-1 flex items-baseline gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
          {label}
        </h2>
        {sub && <p className="text-xs text-muted-foreground/80">· {sub}</p>}
      </div>
      {children}
    </section>
  );
}
