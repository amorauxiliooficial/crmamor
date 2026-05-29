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
  ArrowLeft,
  Loader2,
  Activity,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RiskBanner } from "@/components/forecast/RiskBanner";
import { FunnelSVG } from "@/components/forecast/FunnelSVG";
import { InsightsSidebar } from "@/components/forecast/InsightsSidebar";

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const formatBRLShort = (n: number) => {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(1)}k`;
  return formatBRL(n);
};

const FASE_TONE: Record<string, string> = {
  "Pendência Documental": "amarelo",
  "Elegível (Análise Positiva)": "verde",
  "Aguardando Análise INSS": "azul",
  "Aprovada": "verde",
  "Renegociação": "laranja",
  "Inadimplência": "vermelho",
  "Recurso / Judicial": "vermelho",
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
  const navigate = useNavigate();

  const [ticketMedio, setTicketMedio] = useState(DEFAULT_TICKET_MEDIO);
  const [taxaPagamento, setTaxaPagamento] = useState(DEFAULT_TAXA_PAGAMENTO * 100);
  const [showConfig, setShowConfig] = useState(false);

  const forecast = usePipelineForecast({
    ticketMedio,
    taxaPagamento: taxaPagamento / 100,
  });

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

  if (authLoading || forecast.loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

      <main className="p-4 md:p-6 space-y-4 md:space-y-5 max-w-[1600px] mx-auto">
        {/* Configuração colapsável */}
        {showConfig && (
          <Card className="border-border/60 animate-fade-in">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="ticket" className="text-xs">Ticket médio (R$)</Label>
                <Input
                  id="ticket"
                  type="number"
                  min={0}
                  value={ticketMedio}
                  onChange={(e) => setTicketMedio(Number(e.target.value) || 0)}
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="taxa" className="text-xs">Taxa de pagamento (%)</Label>
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

        {/* BANNER DE RISCO */}
        <RiskBanner
          valorRisco={forecast.risco}
          fasesCriticas={fasesCriticas}
          gapMeta={forecast.gapMeta}
          formatBRL={formatBRL}
        />

        {/* COCKPIT: FUNIL + SIDEBAR */}
        <div className="grid gap-4 md:gap-5 lg:grid-cols-[1fr_340px]">
          {/* FUNIL */}
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
                    Largura proporcional ao valor bruto · passe o mouse para detalhes
                  </p>
                </div>
              </div>

              <FunnelSVG fases={forecast.fases} formatBRLShort={formatBRLShort} />
            </CardContent>
          </Card>

          {/* SIDEBAR INSIGHTS */}
          <InsightsSidebar
            forecast={forecast}
            formatBRL={formatBRL}
            formatBRLShort={formatBRLShort}
          />
        </div>

        {/* TABELA ANALÍTICA */}
        <Card className="border-border/60">
          <CardContent className="p-4 md:p-6 space-y-4">
            <div>
              <h2 className="text-base md:text-lg font-bold tracking-tight">Análise por Fase</h2>
              <p className="text-xs text-muted-foreground">
                Meta saudável = 80% bruto × taxa pagamento
              </p>
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
                  {forecast.fases.map((f) => {
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
                        <TableCell className="text-right text-xs tabular-nums">{f.quantidade}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{formatBRLShort(f.valorBruto)}</TableCell>
                        <TableCell className="text-right text-xs font-semibold tabular-nums">{formatBRLShort(f.valorAjustado)}</TableCell>
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
                          {gap > 0 ? "−" : "+"}
                          {formatBRLShort(Math.abs(gap))}
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
    </div>
  );
}
