import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePipelineForecast, DEFAULT_TICKET_MEDIO, DEFAULT_TAXA_PAGAMENTO } from "@/hooks/usePipelineForecast";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  Zap,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Activity,
  Settings2,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const formatBRLShort = (n: number) => {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(1)}k`;
  return formatBRL(n);
};

// Cor semântica por fase
const FASE_TONE: Record<string, "verde" | "amarelo" | "laranja" | "vermelho" | "cinza" | "azul"> = {
  "Pendência Documental": "amarelo",
  "Elegível (Análise Positiva)": "verde",
  "Aguardando Análise INSS": "azul",
  "Aprovada": "verde",
  "Renegociação": "laranja",
  "Inadimplência": "vermelho",
  "Recurso / Judicial": "vermelho",
  "Processo Encerrado": "cinza",
};

const TONE_BG: Record<string, string> = {
  verde: "from-emerald-500/90 to-emerald-600/90",
  amarelo: "from-amber-400/90 to-amber-500/90",
  laranja: "from-orange-500/90 to-orange-600/90",
  vermelho: "from-rose-500/90 to-rose-600/90",
  cinza: "from-slate-500/80 to-slate-600/80",
  azul: "from-sky-500/90 to-sky-600/90",
};

const TONE_RING: Record<string, string> = {
  verde: "ring-emerald-500/30",
  amarelo: "ring-amber-500/30",
  laranja: "ring-orange-500/30",
  vermelho: "ring-rose-500/30",
  cinza: "ring-slate-500/30",
  azul: "ring-sky-500/30",
};

const TONE_DOT: Record<string, string> = {
  verde: "bg-emerald-500",
  amarelo: "bg-amber-500",
  laranja: "bg-orange-500",
  vermelho: "bg-rose-500",
  cinza: "bg-slate-500",
  azul: "bg-sky-500",
};

interface KpiCardProps {
  title: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "default" | "primary" | "success" | "danger";
  badge?: string;
}

function KpiCard({ title, value, hint, icon: Icon, accent = "default", badge }: KpiCardProps) {
  const ACCENT: Record<string, string> = {
    default: "from-card to-card",
    primary: "from-primary/15 via-card to-card",
    success: "from-emerald-500/15 via-card to-card",
    danger: "from-rose-500/15 via-card to-card",
  };
  const ICON_BG: Record<string, string> = {
    default: "bg-muted text-foreground",
    primary: "bg-primary/15 text-primary",
    success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    danger: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  };
  return (
    <Card className="overflow-hidden border-border/60 backdrop-blur-xl hover:shadow-lg transition-all">
      <CardContent className={cn("relative p-4 md:p-5 bg-gradient-to-br", ACCENT[accent])}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">
                {title}
              </p>
              {badge && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-background/70 border border-border/60">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-2xl md:text-3xl font-bold tracking-tight tabular-nums">{value}</p>
            {hint && <p className="text-[11px] text-muted-foreground line-clamp-1">{hint}</p>}
          </div>
          <div className={cn("shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", ICON_BG[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ForecastDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [ticketMedio, setTicketMedio] = useState(DEFAULT_TICKET_MEDIO);
  const [taxaPagamento, setTaxaPagamento] = useState(DEFAULT_TAXA_PAGAMENTO * 100);
  const [showConfig, setShowConfig] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTone, setFilterTone] = useState<string | null>(null);

  const forecast = usePipelineForecast({
    ticketMedio,
    taxaPagamento: taxaPagamento / 100,
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const maxBruto = useMemo(
    () => Math.max(...forecast.fases.map((f) => f.valorBruto), 1),
    [forecast.fases]
  );

  const filteredFases = useMemo(() => {
    return forecast.fases.filter((f) => {
      if (filterTone && FASE_TONE[f.faseKey] !== filterTone) return false;
      if (search && !f.fase.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [forecast.fases, filterTone, search]);

  if (authLoading || forecast.loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const variacaoAjustado =
    forecast.pipelineBruto > 0
      ? (forecast.pipelineAjustado / forecast.pipelineBruto) * 100
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4 md:px-6 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-bold tracking-tight truncate">
                  Forecast Financial Funnel
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  AO VIVO
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {forecast.totalMaes} mães no pipeline · recalcula automaticamente
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowConfig((s) => !s)}>
            <Settings2 className="h-4 w-4 mr-2" />
            Premissas
          </Button>
        </div>
      </header>

      <main className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Configuração colapsável */}
        {showConfig && (
          <Card className="border-border/60 animate-fade-in">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="ticket" className="text-xs">
                  Ticket médio (R$)
                </Label>
                <Input
                  id="ticket"
                  type="number"
                  min={0}
                  value={ticketMedio}
                  onChange={(e) => setTicketMedio(Number(e.target.value) || 0)}
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="taxa" className="text-xs">
                  Taxa de pagamento (%)
                </Label>
                <Input
                  id="taxa"
                  type="number"
                  min={0}
                  max={100}
                  value={taxaPagamento}
                  onChange={(e) => setTaxaPagamento(Number(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* 1. KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <KpiCard
            title="Pipeline Bruto Total"
            value={formatBRL(forecast.pipelineBruto)}
            hint={`${forecast.totalMaes} mães × ticket ${formatBRLShort(ticketMedio)}`}
            icon={DollarSign}
            accent="default"
          />
          <KpiCard
            title="Pipeline Ajustado"
            value={formatBRL(forecast.pipelineAjustado)}
            hint="Ponderado por probabilidade × taxa"
            icon={TrendingUp}
            accent="primary"
            badge={`${variacaoAjustado.toFixed(0)}%`}
          />
          <KpiCard
            title="Curto Prazo"
            value={formatBRL(forecast.curtoPrazo)}
            hint="Aprovada + Aguardando INSS"
            icon={Zap}
            accent="success"
          />
          <KpiCard
            title="Pipeline em Risco"
            value={formatBRL(forecast.risco)}
            hint="Inadimplência + Renegociação"
            icon={AlertTriangle}
            accent="danger"
          />
        </section>

        {/* 2. FUNIL FINANCEIRO VISUAL — protagonista */}
        <section>
          <Card className="border-border/60 overflow-hidden">
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <h2 className="text-base md:text-lg font-bold tracking-tight">
                      Funil Financeiro
                    </h2>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Largura proporcional ao valor bruto · topo = maior volume · base = menor volume
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  {(["verde", "amarelo", "laranja", "vermelho", "azul"] as const).map(
                    (t) => (
                      <button
                        key={t}
                        onClick={() => setFilterTone(filterTone === t ? null : t)}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all",
                          filterTone === t
                            ? "border-foreground/40 bg-muted"
                            : "border-border/60 hover:bg-muted/50"
                        )}
                      >
                        <span className={cn("h-2 w-2 rounded-full", TONE_DOT[t])} />
                        <span className="capitalize">{t}</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="relative flex flex-col items-center">
                {/* Linhas guia do funil */}
                <div className="absolute inset-x-0 top-0 bottom-0 flex justify-center pointer-events-none">
                  <svg className="h-full w-full max-w-3xl" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="funnelGuide" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--border))" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="hsl(var(--border))" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>
                    <polygon
                      points="0,0 100%,0 70%,100% 30%,100%"
                      fill="url(#funnelGuide)"
                      className="hidden md:block"
                    />
                  </svg>
                </div>

                {forecast.fases.map((f, idx) => {
                  const tone = FASE_TONE[f.faseKey] ?? "cinza";
                  const widthPct = Math.max((f.valorBruto / maxBruto) * 100, 14);
                  const isFiltered = filterTone && filterTone !== tone;
                  const isLast = idx === forecast.fases.length - 1;

                  return (
                    <div key={f.fase} className="w-full flex flex-col items-center z-10">
                      {/* Bloco do funil */}
                      <div
                        className={cn(
                          "group relative transition-all duration-300",
                          isFiltered && "opacity-20 scale-95"
                        )}
                        style={{
                          width: `${widthPct}%`,
                          minWidth: "min(100%, 200px)",
                          animation: `fade-in 0.4s ease-out ${idx * 60}ms both`,
                        }}
                      >
                        <div
                          className={cn(
                            "relative overflow-hidden rounded-xl ring-1 transition-all duration-300",
                            "hover:shadow-2xl hover:-translate-y-0.5",
                            TONE_RING[tone]
                          )}
                        >
                          {/* gradient bg */}
                          <div
                            className={cn(
                              "absolute inset-0 bg-gradient-to-r opacity-95",
                              TONE_BG[tone]
                            )}
                          />
                          {/* shimmer hover */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                          <div className="relative p-3 md:p-4 text-white">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm md:text-base font-bold truncate drop-shadow-sm">
                                    {f.fase}
                                  </span>
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/20 backdrop-blur">
                                    {(f.probabilidade * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <div className="text-[11px] text-white/80 mt-0.5">
                                  {f.quantidade} {f.quantidade === 1 ? "mãe" : "mães"} · bruto{" "}
                                  {formatBRLShort(f.valorBruto)}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-base md:text-lg font-bold tabular-nums drop-shadow-sm">
                                  {formatBRLShort(f.valorAjustado)}
                                </div>
                                <div className="text-[10px] text-white/80">ajustado</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Conector entre blocos */}
                      {!isLast && (
                        <div className="flex flex-col items-center py-1">
                          <div className="w-px h-3 bg-gradient-to-b from-border/60 to-border/20" />
                          <svg
                            width="16"
                            height="8"
                            viewBox="0 0 16 8"
                            fill="none"
                            className="text-muted-foreground/30"
                          >
                            <path d="M8 8L0 0H16L8 8Z" fill="currentColor" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 3. TABELA ANALÍTICA */}
        <section>
          <Card className="border-border/60">
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-base md:text-lg font-bold tracking-tight">
                    Análise por Fase
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Detalhamento financeiro · meta saudável = 80% bruto × taxa pagamento
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar fase..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                  </div>
                  {(search || filterTone) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setFilterTone(null);
                      }}
                    >
                      Limpar
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs">Fase</TableHead>
                      <TableHead className="text-xs text-right">Qtd</TableHead>
                      <TableHead className="text-xs text-right">Bruto</TableHead>
                      <TableHead className="text-xs text-right">Ajustado</TableHead>
                      <TableHead className="text-xs text-right">Prob.</TableHead>
                      <TableHead className="text-xs text-right hidden md:table-cell">Meta</TableHead>
                      <TableHead className="text-xs text-right hidden md:table-cell">Gap</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFases.map((f) => {
                      const tone = FASE_TONE[f.faseKey] ?? "cinza";
                      const meta = f.valorBruto * 0.8 * forecast.taxaPagamento;
                      const gap = meta - f.valorAjustado;
                      return (
                        <TableRow key={f.fase} className="hover:bg-muted/30">
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={cn("h-2 w-2 rounded-full shrink-0", TONE_DOT[tone])} />
                              <span className="text-xs md:text-sm font-medium truncate">
                                {f.fase}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {f.quantidade}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {formatBRLShort(f.valorBruto)}
                          </TableCell>
                          <TableCell className="text-right text-xs font-semibold tabular-nums">
                            {formatBRLShort(f.valorAjustado)}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                            {(f.probabilidade * 100).toFixed(0)}%
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums hidden md:table-cell text-muted-foreground">
                            {formatBRLShort(meta)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right text-xs tabular-nums font-medium hidden md:table-cell",
                              gap > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {gap > 0 ? "-" : "+"}
                            {formatBRLShort(Math.abs(gap))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredFases.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">
                          Nenhuma fase encontrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
