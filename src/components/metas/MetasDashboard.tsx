import { useMetasProgress } from "@/hooks/useMetas";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, Settings, Heart, TrendingUp, TrendingDown, Minus, 
  Baby, Users, FileCheck, Activity, Target, Sparkles, Star, Flame, Trophy
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

// Mensagens motivacionais baseadas no progresso
function getMotivationalMessage(mediaGeral: number, metasAtingidas: number, total: number): { emoji: string; message: string; subMessage: string } {
  if (metasAtingidas === total && total > 0) {
    return { 
      emoji: "🏆", 
      message: "Incrível! Todas as metas batidas!", 
      subMessage: "Você é uma inspiração!" 
    };
  }
  if (mediaGeral >= 80) {
    return { 
      emoji: "🔥", 
      message: "Você está arrasando!", 
      subMessage: "Quase lá, continue assim!" 
    };
  }
  if (mediaGeral >= 60) {
    return { 
      emoji: "💪", 
      message: "Ótimo progresso!", 
      subMessage: "Cada passo conta!" 
    };
  }
  if (mediaGeral >= 40) {
    return { 
      emoji: "✨", 
      message: "Bom trabalho!", 
      subMessage: "Continue focada!" 
    };
  }
  if (mediaGeral > 0) {
    return { 
      emoji: "🌱", 
      message: "Você começou!", 
      subMessage: "O importante é não parar!" 
    };
  }
  return { 
    emoji: "💜", 
    message: "Vamos juntas?", 
    subMessage: "Hoje é um novo dia!" 
  };
}

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
      <Card className="border-dashed border-2 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="py-6 text-center">
          <div className="text-3xl mb-2">💜</div>
          <p className="text-sm font-medium text-foreground mb-1">Vamos definir suas metas?</p>
          <p className="text-xs text-muted-foreground mb-3">Juntas, alcançamos mais!</p>
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
  const motivational = getMotivationalMessage(mediaGeral, metasAtingidas, totalMetas);

  return (
    <div className="space-y-4">
      {/* Header motivacional */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{motivational.emoji}</div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{motivational.message}</h3>
              {metasAtingidas === totalMetas && totalMetas > 0 && (
                <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">{motivational.subMessage}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-lg font-bold text-primary">{mediaGeral.toFixed(0)}%</p>
            <p className="text-[10px] text-muted-foreground">{metasAtingidas}/{totalMetas} metas</p>
          </div>
          {isAdmin && onConfigClick && (
            <Button variant="ghost" size="icon" onClick={onConfigClick} className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Grid de metas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {progress.map((p) => {
          const Icon = TIPO_ICONS[p.meta.tipo_meta] || Heart;
          const atingido = p.percentual >= 100;
          const periodoInfo = PERIODO_LABELS[p.meta.periodo] || PERIODO_LABELS.mensal;
          const progressCapped = Math.min(p.percentual, 100);
          const quaseLa = p.percentual >= 80 && p.percentual < 100;
          
          const isPositive = p.variacao > 0;
          const isNegative = p.variacao < 0;

          return (
            <Card 
              key={p.meta.id}
              className={cn(
                "transition-all hover:shadow-sm relative overflow-hidden",
                atingido && "ring-1 ring-chart-1/30 bg-gradient-to-br from-chart-1/10 to-chart-1/5",
                quaseLa && !atingido && "ring-1 ring-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5"
              )}
            >
              {atingido && (
                <div className="absolute top-1 right-1">
                  <Trophy className="h-3.5 w-3.5 text-chart-1" />
                </div>
              )}
              {quaseLa && !atingido && (
                <div className="absolute top-1 right-1">
                  <Flame className="h-3.5 w-3.5 text-yellow-500 animate-pulse" />
                </div>
              )}
              <CardContent className="p-3">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "w-7 h-7 rounded-md flex items-center justify-center",
                    atingido 
                      ? "bg-chart-1/20 text-chart-1" 
                      : quaseLa
                        ? "bg-yellow-500/20 text-yellow-600"
                        : "bg-primary/10 text-primary"
                  )}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-xs truncate">{p.meta.nome}</h4>
                    <span className="text-[10px] text-muted-foreground">{periodoInfo.current}</span>
                  </div>
                </div>

                {/* Numbers + Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className={cn(
                        "text-lg font-bold tabular-nums",
                        atingido && "text-chart-1",
                        quaseLa && !atingido && "text-yellow-600"
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
                    className={cn(
                      "h-1.5", 
                      atingido && "[&>div]:bg-chart-1",
                      quaseLa && !atingido && "[&>div]:bg-yellow-500"
                    )}
                  />
                  {atingido && (
                    <p className="text-[10px] text-chart-1 font-medium text-center">
                      🎉 Parabéns!
                    </p>
                  )}
                  {quaseLa && !atingido && (
                    <p className="text-[10px] text-yellow-600 font-medium text-center">
                      Quase lá! Falta {p.meta.valor_meta - p.realizado}!
                    </p>
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
