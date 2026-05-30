import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { usePipelineForecast, type FaseForecast } from "@/hooks/usePipelineForecast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Loader2, Activity, Settings2, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { RiskBanner } from "@/components/forecast/RiskBanner";
import { FunnelChart, atingimentoTextColor } from "@/components/forecast/FunnelChart";
import { InsightsSidebar } from "@/components/forecast/InsightsSidebar";
import { FaseDrillDownSheet } from "@/components/forecast/FaseDrillDownSheet";
import { MetasFaseConfigDialog } from "@/components/forecast/MetasFaseConfigDialog";

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const formatBRLShort = (n: number) => {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(1)}k`;
  return formatBRL(n);
};

const FASE_TONE: Record<string, string> = {
  "Gestantes 1 a 8 meses": "rosa",
  "Entradas do Mês": "amarelo",
  "Aguardando Análise INSS": "azul",
  "Aprovada": "verde",
};

const TONE_DOT: Record<string, string> = {
  verde: "bg-emerald-500",
  amarelo: "bg-amber-500",
  laranja: "bg-orange-500",
  vermelho: "bg-rose-500",
  cinza: "bg-slate-500",
  azul: "bg-sky-500",
};

export default function ForecastDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const forecast = usePipelineForecast();

  const [selectedFase, setSelectedFase] = useState<FaseForecast | null>(null);
  const [drillOpen, setDrillOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const fasesCriticas = useMemo(
    () =>
      forecast.fases.filter((f) => {
        const tone = FASE_TONE[f.faseKey];
        return (tone === "vermelho" || tone === "laranja") && f.quantidade > 0;
      }).length,
    [forecast.fases]
  );

  const handleFaseClick = (f: FaseForecast) => {
    setSelectedFase(f);
    setDrillOpen(true);
  };

  if (authLoading || forecast.loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4 md:px-6 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-bold tracking-tight truncate">
                  Forecast Pipeline
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
                {forecast.totalMaes} mães no pipeline · clique numa fase para detalhar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/forecast/tv")}>
              <Monitor className="h-4 w-4 mr-2" />
              Modo TV
            </Button>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
                <Settings2 className="h-4 w-4 mr-2" />
                Metas
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-[1600px] mx-auto">
        <RiskBanner
          valorRisco={forecast.risco}
          fasesCriticas={fasesCriticas}
          gapMeta={forecast.gapMetaTotal}
          formatBRL={formatBRL}
        />

        <div className="grid gap-4 md:gap-5 lg:grid-cols-[1fr_340px]">
          <Card className="border-border/60 overflow-hidden">
            <CardContent className="p-4 md:p-6 space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <h2 className="text-base md:text-lg font-bold tracking-tight">Funil Financeiro</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Largura proporcional · barra de progresso = atingimento da meta · clique para drill-down
                </p>
              </div>

              <FunnelChart fases={forecast.fases} onFaseClick={handleFaseClick} formatBRLShort={formatBRLShort} />
            </CardContent>
          </Card>

          <InsightsSidebar
            forecast={forecast}
            formatBRL={formatBRL}
            formatBRLShort={formatBRLShort}
            onFaseClick={handleFaseClick}
          />
        </div>

        <Card className="border-border/60">
          <CardContent className="p-4 md:p-6 space-y-4">
            <div>
              <h2 className="text-base md:text-lg font-bold tracking-tight">Análise por Fase</h2>
              <p className="text-xs text-muted-foreground">
                Clique numa fase para ver mães, tempo na fase e detalhes
              </p>
            </div>

            <div className="rounded-lg border border-border/60 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs">Fase</TableHead>
                    <TableHead className="text-xs text-right">Qtd</TableHead>
                    <TableHead className="text-xs text-right hidden sm:table-cell">Meta Qtd</TableHead>
                    <TableHead className="text-xs text-right">Bruto</TableHead>
                    <TableHead className="text-xs text-right hidden md:table-cell">Meta</TableHead>
                    <TableHead className="text-xs text-right hidden md:table-cell">Gap</TableHead>
                    <TableHead className="text-xs text-right">Atingim.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecast.fases.map((f) => {
                    const tone = FASE_TONE[f.faseKey] ?? "cinza";
                    const hasMeta = f.metaValor > 0 || f.metaQuantidade > 0;
                    return (
                      <TableRow
                        key={f.fase}
                        className="hover:bg-muted/40 cursor-pointer"
                        onClick={() => handleFaseClick(f)}
                      >
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn("h-2 w-2 rounded-full shrink-0", TONE_DOT[tone])} />
                            <span className="text-xs md:text-sm font-medium truncate">{f.fase}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{f.quantidade}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums hidden sm:table-cell text-muted-foreground">
                          {f.metaQuantidade || "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold tabular-nums">
                          {formatBRLShort(f.valorBruto)}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums hidden md:table-cell text-muted-foreground">
                          {hasMeta ? formatBRLShort(f.metaValor) : "—"}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right text-xs tabular-nums font-medium hidden md:table-cell",
                            f.gapValor > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {hasMeta ? `${f.gapValor > 0 ? "−" : "+"}${formatBRLShort(Math.abs(f.gapValor))}` : "—"}
                        </TableCell>
                        <TableCell className={cn("text-right text-xs font-bold tabular-nums", atingimentoTextColor(f.atingimentoPct, hasMeta))}>
                          {hasMeta ? `${(f.atingimentoPct * 100).toFixed(0)}%` : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
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
