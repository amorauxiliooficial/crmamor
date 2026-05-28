import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePipelineForecast, DEFAULT_TICKET_MEDIO, DEFAULT_TAXA_PAGAMENTO } from "@/hooks/usePipelineForecast";
import { ForecastPipelineCard } from "@/components/forecast/ForecastPipelineCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  Zap,
  AlertTriangle,
  Percent,
  Target,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const RISCO_CLASSES: Record<string, string> = {
  verde: "bg-emerald-500",
  amarelo: "bg-amber-500",
  vermelho: "bg-rose-500",
};

const RISCO_BADGE: Record<string, string> = {
  verde: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  amarelo: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  vermelho: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
};

export default function ForecastDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [ticketMedio, setTicketMedio] = useState(DEFAULT_TICKET_MEDIO);
  const [taxaPagamento, setTaxaPagamento] = useState(DEFAULT_TAXA_PAGAMENTO * 100);

  const forecast = usePipelineForecast({
    ticketMedio,
    taxaPagamento: taxaPagamento / 100,
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  if (authLoading || forecast.loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const maxBruto = Math.max(...forecast.fases.map((f) => f.valorBruto), 1);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-base md:text-lg font-bold tracking-tight">Forecast Pipeline</h1>
              <p className="text-[11px] text-muted-foreground">
                {forecast.totalMaes} mães no pipeline · atualização automática
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Config inputs */}
        <Card>
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

        {/* 6 Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <ForecastPipelineCard
            title="Pipeline Bruto Total"
            value={formatBRL(forecast.pipelineBruto)}
            description="Soma de todas as fases × ticket médio"
            icon={DollarSign}
            tone="default"
          />
          <ForecastPipelineCard
            title="Pipeline Ajustado"
            value={formatBRL(forecast.pipelineAjustado)}
            description="Ponderado por probabilidade × taxa de pagamento"
            icon={TrendingUp}
            tone="primary"
          />
          <ForecastPipelineCard
            title="Curto Prazo"
            value={formatBRL(forecast.curtoPrazo)}
            description="Aprovada + Aguardando INSS"
            icon={Zap}
            tone="success"
          />
          <ForecastPipelineCard
            title="Risco"
            value={formatBRL(forecast.risco)}
            description="Inadimplência + Renegociação"
            icon={AlertTriangle}
            tone="danger"
          />
          <ForecastPipelineCard
            title="Taxa Pagamento"
            value={`${(forecast.taxaPagamento * 100).toFixed(0)}%`}
            description="Configurada para o cálculo"
            icon={Percent}
            tone="default"
          />
          <ForecastPipelineCard
            title="Gap Meta Saudável"
            value={formatBRL(Math.abs(forecast.gapMeta))}
            description={
              forecast.gapMeta > 0
                ? `Falta para atingir ${formatBRL(forecast.metaSaudavel)}`
                : `Acima da meta de ${formatBRL(forecast.metaSaudavel)}`
            }
            icon={Target}
            tone={forecast.gapMeta > 0 ? "warning" : "success"}
          />
        </div>

        {/* Funil financeiro */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Funil Financeiro</CardTitle>
            <p className="text-xs text-muted-foreground">
              Valor bruto e ajustado por fase do pipeline
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {forecast.fases.map((f) => {
              const widthPct = (f.valorBruto / maxBruto) * 100;
              return (
                <div key={f.fase} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs md:text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          "text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border",
                          RISCO_BADGE[f.risco]
                        )}
                      >
                        {f.quantidade}
                      </span>
                      <span className="font-medium truncate">{f.fase}</span>
                      <span className="text-muted-foreground text-[11px] hidden sm:inline">
                        · {(f.probabilidade * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold">{formatBRL(f.valorAjustado)}</div>
                      <div className="text-[10px] text-muted-foreground">
                        bruto {formatBRL(f.valorBruto)}
                      </div>
                    </div>
                  </div>
                  <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full transition-all", RISCO_CLASSES[f.risco], "opacity-30")}
                      style={{ width: `${widthPct}%` }}
                    />
                    <div
                      className={cn("absolute top-0 left-0 h-full transition-all", RISCO_CLASSES[f.risco])}
                      style={{
                        width: `${(f.valorAjustado / maxBruto) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
