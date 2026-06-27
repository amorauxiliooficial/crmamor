import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { usePipelineForecast, type FaseForecast } from "@/hooks/usePipelineForecast";
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
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Users,
  Lightbulb,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FaseDrillDownSheet } from "@/components/forecast/FaseDrillDownSheet";
import { MetasFaseConfigDialog } from "@/components/forecast/MetasFaseConfigDialog";
import { ExecutiveKpis } from "@/components/forecast/ExecutiveKpis";
import { ForecastChart } from "@/components/forecast/ForecastChart";
import { ExecutivePipelineTable } from "@/components/forecast/ExecutivePipelineTable";
import { CarteiraDonutCard } from "@/components/forecast/CarteiraDonutCard";
import { BaterMetaCard } from "@/components/forecast/BaterMetaCard";
import { RecebimentosPanels } from "@/components/forecast/RecebimentosPanels";
import { InsightsPanel, type InsightItem } from "@/components/forecast/InsightsPanel";

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

export default function ForecastDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const forecast = usePipelineForecast();

  const today = new Date();
  const [mes, setMes] = useState(today.getMonth());
  const [ano, setAno] = useState(today.getFullYear());
  const refDate = useMemo(() => new Date(ano, mes, 1), [mes, ano]);
  const executivo = useExecutiveForecast(refDate);

  const yearOptions = useMemo(() => {
    const y = today.getFullYear();
    return [y - 1, y, y + 1];
  }, [today]);

  const [selectedFase, setSelectedFase] = useState<FaseForecast | null>(null);
  const [drillOpen, setDrillOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const handleFaseClick = (f: FaseForecast) => {
    setSelectedFase(f);
    setDrillOpen(true);
  };

  // ----- Insights automáticos -----
  const insights: InsightItem[] = useMemo(() => {
    const out: InsightItem[] = [];
    const { kpis, carteira, composicao, mesRisco } = executivo;

    // Trend receita prevista
    if (Math.abs(kpis.deltaPrevistoPct) >= 1) {
      const up = kpis.deltaPrevistoPct > 0;
      out.push({
        id: "trend-prev",
        text: `Receita prevista ${up ? "aumentou" : "caiu"} ${Math.abs(kpis.deltaPrevistoPct).toFixed(0)}% em relação ao mês anterior.`,
        tone: up ? "positive" : "negative",
        icon: up ? TrendingUp : TrendingDown,
      });
    }

    // Carteira parcelada
    if (carteira.totalContratado > 0 && carteira.pctParcelado >= 50) {
      out.push({
        id: "carteira-parcelado",
        text: `Sua carteira parcelada representa ${carteira.pctParcelado.toFixed(0)}% da receita contratada.`,
        tone: "info",
        icon: Target,
      });
    }

    // Risco mês futuro
    if (mesRisco) {
      out.push({
        id: "risco-mes",
        text: `Existe risco de queda de receita em ${mesRisco.label} — projetado ${formatBRLShort(mesRisco.total)} contra meta de ${formatBRLShort(mesRisco.meta)}.`,
        tone: "warning",
        icon: AlertTriangle,
      });
    }

    // Gap mães
    if (composicao.gap > 0 && composicao.opcaoAVista > 0) {
      out.push({
        id: "gap-maes",
        text: `Faltam aproximadamente ${composicao.opcaoAVista} ${composicao.opcaoAVista === 1 ? "nova mãe" : "novas mães"} à vista (ou ${composicao.opcaoParcelada} parceladas) para bater a meta.`,
        tone: "warning",
        icon: Users,
      });
    } else if (composicao.gap <= 0 && kpis.metaMes > 0) {
      out.push({
        id: "meta-coberta",
        text: "Pipeline atual cobre 100% da meta projetada do mês.",
        tone: "positive",
        icon: Target,
      });
    }

    // Etapa Gestantes abaixo
    const gest = forecast.fases.find((f) => f.faseKey === "Gestantes 1 a 8 meses");
    if (gest && gest.metaQuantidade > 0 && gest.quantidade < gest.metaQuantidade * 0.7) {
      out.push({
        id: "gestantes-baixa",
        text: `A etapa Gestantes está abaixo da capacidade ideal (${gest.quantidade} / ${gest.metaQuantidade}).`,
        tone: "warning",
        icon: Users,
      });
    }

    // Saldo operacional negativo
    if (kpis.saldoOperacional < 0) {
      out.push({
        id: "saldo-negativo",
        text: `Saldo operacional do mês está negativo em ${formatBRL(Math.abs(kpis.saldoOperacional))}.`,
        tone: "negative",
        icon: TrendingDown,
      });
    }

    return out.slice(0, 6);
  }, [executivo, forecast.fases]);

  if (authLoading || forecast.loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 md:px-8 max-w-[1500px] mx-auto gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-bold tracking-tight truncate">
                  Dashboard Executivo
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  AO VIVO
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Saúde financeira e operacional em tempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
              <SelectTrigger className="h-8 w-[120px] text-xs capitalize">
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
              <SelectTrigger className="h-8 w-[90px] text-xs">
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
            <Button variant="outline" size="sm" onClick={() => navigate("/forecast/tv")}>
              <Monitor className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Modo TV</span>
            </Button>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
                <Settings2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Metas</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 md:px-8 py-6 md:py-8 space-y-6 md:space-y-8 max-w-[1500px] mx-auto">
        {/* BLOCO 1 — RESUMO EXECUTIVO */}
        <section className="space-y-3">
          <SectionHeader
            label="Resumo Executivo"
            sub="Os cinco números que importam agora"
          />
          <ExecutiveKpis kpis={executivo.kpis} formatBRL={formatBRL} />
        </section>

        {/* BLOCO 2 — FORECAST FINANCEIRO */}
        <section className="space-y-3">
          <SectionHeader label="Forecast Financeiro" sub="Para onde a receita está indo" />
          <ForecastChart
            data={executivo.forecast6m}
            metaMes={executivo.kpis.metaMes}
            formatBRL={formatBRL}
            formatBRLShort={formatBRLShort}
          />
        </section>

        {/* BLOCO 3 — PIPELINE EXECUTIVO */}
        <section className="space-y-3">
          <SectionHeader label="Pipeline Executivo" sub="Saúde de cada etapa do funil" />
          <ExecutivePipelineTable
            fases={forecast.fases}
            onFaseClick={handleFaseClick}
            formatBRLShort={formatBRLShort}
          />
        </section>

        {/* BLOCO 4 + 5 — CARTEIRA + BATER META */}
        <section className="space-y-3">
          <SectionHeader label="Carteira & Plano de Ação" sub="O que existe e o que precisa acontecer" />
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <CarteiraDonutCard carteira={executivo.carteira} formatBRL={formatBRL} />
            <BaterMetaCard composicao={executivo.composicao} formatBRL={formatBRL} />
          </div>
        </section>

        {/* BLOCO 6 + 7 — RECEBIMENTOS */}
        <section className="space-y-3">
          <SectionHeader label="Recebimentos" sub="O que entrou recentemente e o que está por vir" />
          <RecebimentosPanels
            ultimas={executivo.ultimasEntradas}
            proximos={executivo.proximosRecebimentos}
            formatBRL={formatBRL}
          />
        </section>

        {/* BLOCO 8 — INSIGHTS */}
        <section className="space-y-3">
          <SectionHeader label="Inteligência" sub="Leituras automáticas dos dados" icon={Lightbulb} />
          <InsightsPanel insights={insights} />
        </section>
      </main>

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

function SectionHeader({
  label,
  sub,
  icon: Icon,
}: {
  label: string;
  sub?: string;
  icon?: typeof Lightbulb;
}) {
  return (
    <div className="flex items-end justify-between gap-3 px-1">
      <div>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </h2>
        </div>
        {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
