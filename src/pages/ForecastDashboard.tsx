import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useExecutiveForecast } from "@/hooks/useExecutiveForecast";
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
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { FaseDrillDownSheet } from "@/components/forecast/FaseDrillDownSheet";
import { MetasFaseConfigDialog } from "@/components/forecast/MetasFaseConfigDialog";
import { ExecutiveKpis } from "@/components/forecast/ExecutiveKpis";
import { ForecastChart } from "@/components/forecast/ForecastChart";
import { ExecutivePipelineTable } from "@/components/forecast/ExecutivePipelineTable";
import { CarteiraDonutCard } from "@/components/forecast/CarteiraDonutCard";
import { BaterMetaCard } from "@/components/forecast/BaterMetaCard";
import { RecebimentosPanels } from "@/components/forecast/RecebimentosPanels";
import { InsightsPanel, type InsightItem } from "@/components/forecast/InsightsPanel";
import { MetaFinanceiraDialog } from "@/components/forecast/MetaFinanceiraDialog";
import type { FaseForecast } from "@/hooks/usePipelineForecast";

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
  { id: "resumo", label: "Resumo Executivo", icon: LayoutDashboard },
  { id: "forecast", label: "Forecast Financeiro", icon: LineChart },
  { id: "pipeline", label: "Pipeline Operacional", icon: GitBranch },
  { id: "carteira", label: "Carteira Financeira", icon: Wallet },
  { id: "meta", label: "Como bater a meta", icon: Target },
  { id: "entradas", label: "Últimas Entradas", icon: Inbox },
  { id: "recebimentos", label: "Próximos Recebimentos", icon: CalendarClock },
  { id: "insights", label: "Insights Inteligentes", icon: Lightbulb },
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

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

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
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (authLoading || executivo.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-pink-50/30 to-sky-50/40">
      <div className="flex min-h-screen">
        {/* ===== SIDEBAR ===== */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-pink-100/70 bg-white/80 backdrop-blur sticky top-0 h-screen">
          <div className="px-5 py-5 border-b border-pink-100/70">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-pink-600 transition-colors mb-3"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao CRM
            </button>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500 to-sky-500 grid place-items-center text-white shadow-md shadow-pink-500/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold tracking-tight truncate">Central de</h1>
                <p className="text-sm font-bold bg-gradient-to-r from-pink-600 to-sky-600 bg-clip-text text-transparent -mt-0.5">
                  Performance
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {NAV_SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
                    active
                      ? "bg-gradient-to-r from-pink-500/10 to-sky-500/10 text-pink-700 shadow-sm"
                      : "text-muted-foreground hover:bg-pink-50 hover:text-pink-600",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active && "text-pink-500")} />
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="px-4 py-4 border-t border-pink-100/70 space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start border-sky-200 text-sky-700 hover:bg-sky-50"
              onClick={() => navigate("/forecast/tv")}
            >
              <Monitor className="h-4 w-4 mr-2" />
              Modo TV
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start border-pink-200 text-pink-700 hover:bg-pink-50"
                onClick={() => setConfigOpen(true)}
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Configurar Metas
              </Button>
            )}
          </div>
        </aside>

        {/* ===== CONTEÚDO ===== */}
        <div className="flex-1 min-w-0">
          {/* HEADER */}
          <header className="sticky top-0 z-40 border-b border-pink-100/70 bg-white/85 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-8">
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => navigate("/")}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base md:text-lg font-bold tracking-tight truncate">
                      Central de Performance
                    </h2>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </span>
                      AO VIVO
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground capitalize">
                    {format(refDate, "MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                  <SelectTrigger className="h-9 w-[130px] text-xs capitalize border-pink-200 bg-white">
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
                  <SelectTrigger className="h-9 w-[90px] text-xs border-sky-200 bg-white">
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
            {/* 1 - RESUMO */}
            <Section id="resumo" label="Resumo Executivo" sub="Os números que importam agora">
              <ExecutiveKpis kpis={executivo.kpis} formatBRL={formatBRL} />
            </Section>

            {/* 2 - FORECAST */}
            <Section
              id="forecast"
              label="Forecast Financeiro"
              sub="Receita prevista por mês"
            >
              <ForecastChart
                data={executivo.forecast6m}
                metaMes={executivo.kpis.metaMes}
                formatBRL={formatBRL}
                formatBRLShort={formatBRLShort}
              />
            </Section>

            {/* 3 - PIPELINE */}
            <Section id="pipeline" label="Pipeline Operacional" sub="Saúde de cada etapa do funil">
              <ExecutivePipelineTable
                fases={executivo.pipelineOperacional.fases}
                onFaseClick={handleFaseClick}
                formatBRLShort={formatBRLShort}
              />
            </Section>

            {/* 4 - CARTEIRA */}
            <Section id="carteira" label="Carteira Financeira" sub="Contratado, recebido e a receber">
              <CarteiraDonutCard carteira={executivo.carteira} formatBRL={formatBRL} />
            </Section>

            {/* 5 - COMO BATER A META */}
            <Section id="meta" label="Como bater a meta" sub="Composição sugerida para o gap">
              <BaterMetaCard composicao={executivo.composicao} formatBRL={formatBRL} />
            </Section>

            {/* 6 + 7 - ENTRADAS / RECEBIMENTOS */}
            <Section
              id="entradas"
              label="Últimas Entradas & Próximos Recebimentos"
              sub="Histórico recente e agenda de cobrança"
            >
              <div id="recebimentos">
                <RecebimentosPanels
                  ultimas={executivo.ultimasEntradas}
                  proximos={executivo.proximosRecebimentos}
                  formatBRL={formatBRL}
                />
              </div>
            </Section>

            {/* 8 - INSIGHTS */}
            <Section
              id="insights"
              label="Insights Inteligentes"
              sub="Análises automáticas sobre seus dados"
            >
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

      <MetasFaseConfigDialog open={configOpen} onOpenChange={setConfigOpen} />
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
      <div className="px-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pink-600">
          {label}
        </h2>
        {sub && <p className="text-xs text-muted-foreground/80 mt-0.5">{sub}</p>}
      </div>
      {children}
    </section>
  );
}
