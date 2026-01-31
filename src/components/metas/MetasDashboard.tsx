import { useMetasProgress } from "@/hooks/useMetas";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, Heart, TrendingUp, TrendingDown, Minus, Baby, Users, FileCheck, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetasDashboardProps {
  userId: string | null;
  onConfigClick?: () => void;
  isAdmin?: boolean;
}

const TIPO_ICONS: Record<string, typeof Heart> = {
  cadastros: Users,
  contratos: FileCheck,
  aprovados: Baby,
  atividades: Activity,
  follow_ups: Activity,
};

const PERIODO_LABELS: Record<string, { current: string; previous: string }> = {
  diario: { current: "Hoje", previous: "vs ontem" },
  semanal: { current: "Esta semana", previous: "vs semana passada" },
  mensal: { current: "Este mês", previous: "vs mês passado" },
};

export function MetasDashboard({ userId, onConfigClick, isAdmin }: MetasDashboardProps) {
  const { progress, loading } = useMetasProgress(userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Carregando metas...</span>
        </div>
      </div>
    );
  }

  if (progress.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-gradient-to-br from-primary/5 to-accent/10">
        <CardContent className="py-8 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">Nenhuma meta configurada</p>
          <p className="text-xs text-muted-foreground mb-4">Configure suas metas para acompanhar seu progresso</p>
          {isAdmin && onConfigClick && (
            <Button variant="outline" size="sm" onClick={onConfigClick} className="gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              Configurar Metas
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totalMetas = progress.length;
  const metasAtingidas = progress.filter(p => p.percentual >= 100).length;
  const mediaGeral = progress.reduce((acc, p) => acc + Math.min(p.percentual, 100), 0) / totalMetas;

  return (
    <div className="space-y-4">
      {/* Header with warm branding */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent-foreground flex items-center justify-center shadow-sm">
            <Heart className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Suas Metas</h2>
            <p className="text-xs text-muted-foreground">
              {metasAtingidas} de {totalMetas} alcançadas • {mediaGeral.toFixed(0)}% no geral
            </p>
          </div>
        </div>
        {isAdmin && onConfigClick && (
          <Button variant="ghost" size="icon" onClick={onConfigClick} className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Meta Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {progress.map((p) => {
          const Icon = TIPO_ICONS[p.meta.tipo_meta] || Heart;
          const atingido = p.percentual >= 100;
          const periodoInfo = PERIODO_LABELS[p.meta.periodo] || PERIODO_LABELS.mensal;
          const progressCapped = Math.min(p.percentual, 100);
          
          // Determine trend
          const isPositive = p.variacao > 0;
          const isNegative = p.variacao < 0;
          const isNeutral = p.variacao === 0;

          return (
            <Card 
              key={p.meta.id}
              className={cn(
                "relative overflow-hidden transition-all hover:shadow-md",
                atingido && "ring-1 ring-chart-1/30 bg-gradient-to-br from-chart-1/5 to-chart-1/10"
              )}
            >
              {/* Progress bar background */}
              <div 
                className={cn(
                  "absolute bottom-0 left-0 h-1 transition-all",
                  atingido ? "bg-chart-1" : "bg-primary"
                )}
                style={{ width: `${progressCapped}%` }}
              />
              
              <CardContent className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center",
                    atingido 
                      ? "bg-chart-1/20 text-chart-1" 
                      : "bg-primary/10 text-primary"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                    {periodoInfo.current}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-medium text-sm mb-2 line-clamp-1">{p.meta.nome}</h3>

                {/* Numbers */}
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className={cn(
                    "text-2xl font-bold tabular-nums",
                    atingido && "text-chart-1"
                  )}>
                    {p.realizado}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {p.meta.valor_meta}
                  </span>
                  {atingido && (
                    <span className="ml-auto text-xs font-medium text-chart-1 bg-chart-1/10 px-1.5 py-0.5 rounded">
                      ✓ Meta
                    </span>
                  )}
                </div>

                {/* Comparison with previous period */}
                <div className="flex items-center gap-1.5 text-xs">
                  {isPositive && (
                    <>
                      <TrendingUp className="h-3 w-3 text-chart-1" />
                      <span className="text-chart-1 font-medium">+{p.variacao.toFixed(0)}%</span>
                    </>
                  )}
                  {isNegative && (
                    <>
                      <TrendingDown className="h-3 w-3 text-destructive" />
                      <span className="text-destructive font-medium">{p.variacao.toFixed(0)}%</span>
                    </>
                  )}
                  {isNeutral && (
                    <>
                      <Minus className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">0%</span>
                    </>
                  )}
                  <span className="text-muted-foreground">
                    {periodoInfo.previous}
                  </span>
                  {p.realizadoAnterior > 0 && (
                    <span className="text-muted-foreground ml-auto">
                      ({p.realizadoAnterior} ant.)
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
