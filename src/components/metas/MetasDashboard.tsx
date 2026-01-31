import { useMetasProgress } from "@/hooks/useMetas";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, Settings, Heart, TrendingUp, TrendingDown, Minus, 
  Baby, Users, FileCheck, Activity, Target, Award
} from "lucide-react";
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
  semanal: { current: "Semana", previous: "vs anterior" },
  mensal: { current: "Mês", previous: "vs anterior" },
};

export function MetasDashboard({ userId, onConfigClick, isAdmin }: MetasDashboardProps) {
  const { progress, loading } = useMetasProgress(userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (progress.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="py-6 text-center">
          <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">Nenhuma meta configurada</p>
          {isAdmin && onConfigClick && (
            <Button variant="outline" size="sm" onClick={onConfigClick} className="gap-1.5">
              <Settings className="h-3.5 w-3.5" />
              Configurar
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
      {/* Header compacto */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Metas</h3>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">|</span>
            <Award className="h-4 w-4 text-chart-1" />
            <span className="font-medium">{metasAtingidas}/{totalMetas}</span>
            <span className="text-muted-foreground">•</span>
            <span className="font-medium text-primary">{mediaGeral.toFixed(0)}%</span>
          </div>
        </div>
        {isAdmin && onConfigClick && (
          <Button variant="ghost" size="icon" onClick={onConfigClick} className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Grid de metas compacto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {progress.map((p) => {
          const Icon = TIPO_ICONS[p.meta.tipo_meta] || Heart;
          const atingido = p.percentual >= 100;
          const periodoInfo = PERIODO_LABELS[p.meta.periodo] || PERIODO_LABELS.mensal;
          const progressCapped = Math.min(p.percentual, 100);
          
          const isPositive = p.variacao > 0;
          const isNegative = p.variacao < 0;

          return (
            <Card 
              key={p.meta.id}
              className={cn(
                "transition-all hover:shadow-sm",
                atingido && "ring-1 ring-chart-1/30 bg-chart-1/5"
              )}
            >
              <CardContent className="p-3">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-7 h-7 rounded-md flex items-center justify-center",
                      atingido 
                        ? "bg-chart-1/20 text-chart-1" 
                        : "bg-primary/10 text-primary"
                    )}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-medium text-xs truncate">{p.meta.nome}</h4>
                      <span className="text-[10px] text-muted-foreground">{periodoInfo.current}</span>
                    </div>
                  </div>
                  {atingido && (
                    <span className="text-[10px] font-medium text-chart-1 bg-chart-1/10 px-1.5 py-0.5 rounded">
                      ✓
                    </span>
                  )}
                </div>

                {/* Numbers + Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className={cn(
                        "text-lg font-bold tabular-nums",
                        atingido && "text-chart-1"
                      )}>
                        {p.realizado}
                      </span>
                      <span className="text-xs text-muted-foreground">/{p.meta.valor_meta}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      {isPositive && (
                        <>
                          <TrendingUp className="h-3 w-3 text-chart-1" />
                          <span className="text-chart-1">+{p.variacao.toFixed(0)}%</span>
                        </>
                      )}
                      {isNegative && (
                        <>
                          <TrendingDown className="h-3 w-3 text-destructive" />
                          <span className="text-destructive">{p.variacao.toFixed(0)}%</span>
                        </>
                      )}
                      {!isPositive && !isNegative && (
                        <>
                          <Minus className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">0%</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Progress 
                    value={progressCapped} 
                    className={cn("h-1.5", atingido && "[&>div]:bg-chart-1")}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
