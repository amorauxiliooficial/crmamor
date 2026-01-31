import { useMetasProgress } from "@/hooks/useMetas";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, Heart, Baby, Users, FileCheck, Activity, Target, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

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

const PERIODO_LABELS: Record<string, string> = {
  diario: "Hoje",
  semanal: "Semana",
  mensal: "Mês",
};

function getMotivationalMessage(mediaGeral: number, metasAtingidas: number, total: number): { emoji: string; message: string } {
  if (metasAtingidas === total && total > 0) {
    return { emoji: "🏆", message: "Todas as metas batidas!" };
  }
  if (mediaGeral >= 80) {
    return { emoji: "🔥", message: "Você está arrasando!" };
  }
  if (mediaGeral >= 60) {
    return { emoji: "💪", message: "Ótimo progresso!" };
  }
  if (mediaGeral >= 40) {
    return { emoji: "✨", message: "Continue assim!" };
  }
  if (mediaGeral > 0) {
    return { emoji: "🌱", message: "Bom começo!" };
  }
  return { emoji: "💜", message: "Vamos juntas?" };
}

// Mini radial progress component
function RadialProgress({ 
  value, 
  size = 48, 
  strokeWidth = 5,
  atingido = false,
  quaseLa = false
}: { 
  value: number; 
  size?: number; 
  strokeWidth?: number;
  atingido?: boolean;
  quaseLa?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={atingido ? "hsl(var(--chart-1))" : quaseLa ? "hsl(45 93% 47%)" : "hsl(var(--primary))"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn(
          "text-xs font-bold",
          atingido && "text-chart-1"
        )}>
          {Math.min(value, 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
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

  const totalMetas = progress.length;
  const metasAtingidas = progress.filter(p => p.percentual >= 100).length;
  const mediaGeral = progress.reduce((acc, p) => acc + Math.min(p.percentual, 100), 0) / totalMetas;
  const motivational = getMotivationalMessage(mediaGeral, metasAtingidas, totalMetas);

  // Pie chart data for overall progress
  const pieData = [
    { name: "Progresso", value: mediaGeral },
    { name: "Restante", value: Math.max(0, 100 - mediaGeral) },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Left: Pie Chart Geral */}
          <div className="flex flex-col items-center shrink-0">
            <div className="relative w-20 h-20">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={28}
                    outerRadius={38}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={0}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    <Cell fill={metasAtingidas === totalMetas ? "hsl(var(--chart-1))" : "hsl(var(--primary))"} />
                    <Cell fill="hsl(var(--muted))" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn(
                  "text-lg font-bold",
                  metasAtingidas === totalMetas && "text-chart-1"
                )}>
                  {mediaGeral.toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="text-center mt-1">
              <p className="text-[10px] text-muted-foreground">{metasAtingidas}/{totalMetas} metas</p>
            </div>
          </div>

          {/* Right: Metas Grid */}
          <div className="flex-1 min-w-0">
            {/* Header motivacional */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{motivational.emoji}</span>
                <span className="font-medium text-sm">{motivational.message}</span>
                {metasAtingidas === totalMetas && totalMetas > 0 && (
                  <Sparkles className="h-4 w-4 text-chart-1 animate-pulse" />
                )}
              </div>
              {isAdmin && onConfigClick && (
                <Button variant="ghost" size="icon" onClick={onConfigClick} className="h-7 w-7">
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Mini cards grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {progress.map((p, index) => {
                const Icon = TIPO_ICONS[p.meta.tipo_meta] || Heart;
                const atingido = p.percentual >= 100;
                const quaseLa = p.percentual >= 80 && p.percentual < 100;
                const periodoLabel = PERIODO_LABELS[p.meta.periodo] || "Mês";
                const faltam = Math.max(0, p.meta.valor_meta - p.realizado);

                return (
                  <div
                    key={p.meta.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border transition-all animate-fade-in opacity-0 [animation-fill-mode:forwards]",
                      atingido 
                        ? "bg-chart-1/10 border-chart-1/30" 
                        : quaseLa 
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-muted/30 border-border"
                    )}
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <RadialProgress 
                      value={p.percentual} 
                      size={40} 
                      strokeWidth={4}
                      atingido={atingido}
                      quaseLa={quaseLa}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <Icon className={cn(
                          "h-3 w-3 shrink-0",
                          atingido ? "text-chart-1" : quaseLa ? "text-amber-500" : "text-primary"
                        )} />
                        <span className="text-[10px] font-medium truncate">{p.meta.nome}</span>
                      </div>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className={cn(
                          "text-sm font-bold tabular-nums",
                          atingido && "text-chart-1"
                        )}>
                          {p.realizado}
                        </span>
                        <span className="text-[10px] text-muted-foreground">/{p.meta.valor_meta}</span>
                      </div>
                      <p className={cn(
                        "text-[9px]",
                        atingido 
                          ? "text-chart-1" 
                          : quaseLa 
                            ? "text-amber-600" 
                            : "text-muted-foreground"
                      )}>
                        {atingido 
                          ? "🎉 Batida!" 
                          : quaseLa 
                            ? `🔥 Falta ${faltam}!` 
                            : periodoLabel
                        }
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
