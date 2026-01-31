import { useMetasProgress } from "@/hooks/useMetas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, Settings, Heart, TrendingUp, TrendingDown, Minus, 
  Baby, Users, FileCheck, Activity, Target, Award, Zap, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

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

const chartConfig = {
  realizado: { label: "Realizado", color: "hsl(var(--primary))" },
  meta: { label: "Meta", color: "hsl(var(--muted))" },
  atingido: { label: "Atingido", color: "hsl(var(--chart-1))" },
  pendente: { label: "Pendente", color: "hsl(var(--chart-2))" },
};

export function MetasDashboard({ userId, onConfigClick, isAdmin }: MetasDashboardProps) {
  const { progress, loading } = useMetasProgress(userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm">Carregando dashboard...</span>
        </div>
      </div>
    );
  }

  if (progress.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-gradient-to-br from-primary/5 to-accent/10">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma meta configurada</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Configure suas metas para acompanhar seu progresso e alcançar seus objetivos
          </p>
          {isAdmin && onConfigClick && (
            <Button onClick={onConfigClick} className="gap-2">
              <Settings className="h-4 w-4" />
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
  const totalRealizado = progress.reduce((acc, p) => acc + p.realizado, 0);
  const totalMeta = progress.reduce((acc, p) => acc + p.meta.valor_meta, 0);

  // Chart data for bar chart
  const barChartData = progress.map(p => ({
    name: p.meta.nome.length > 12 ? p.meta.nome.substring(0, 12) + "..." : p.meta.nome,
    fullName: p.meta.nome,
    realizado: p.realizado,
    meta: p.meta.valor_meta,
    percentual: Math.min(p.percentual, 100),
    atingido: p.percentual >= 100,
  }));

  // Pie chart data
  const pieData = [
    { name: "Atingidas", value: metasAtingidas, fill: "hsl(var(--chart-1))" },
    { name: "Em progresso", value: totalMetas - metasAtingidas, fill: "hsl(var(--primary))" },
  ];

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Dashboard de Metas
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Acompanhe seu progresso em tempo real
          </p>
        </div>
        {isAdmin && onConfigClick && (
          <Button variant="outline" size="sm" onClick={onConfigClick} className="gap-2">
            <Settings className="h-4 w-4" />
            Configurar
          </Button>
        )}
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Progresso Geral */}
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <span className="text-2xl font-bold text-primary">{mediaGeral.toFixed(0)}%</span>
            </div>
            <p className="text-sm font-medium text-foreground">Progresso Geral</p>
            <Progress value={mediaGeral} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        {/* Metas Atingidas */}
        <Card className="bg-gradient-to-br from-chart-1/10 via-chart-1/5 to-transparent border-chart-1/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-chart-1/20 flex items-center justify-center">
                <Award className="h-5 w-5 text-chart-1" />
              </div>
              <span className="text-2xl font-bold text-chart-1">{metasAtingidas}/{totalMetas}</span>
            </div>
            <p className="text-sm font-medium text-foreground">Metas Atingidas</p>
            <p className="text-xs text-muted-foreground mt-1">
              {((metasAtingidas / totalMetas) * 100).toFixed(0)}% concluído
            </p>
          </CardContent>
        </Card>

        {/* Total Realizado */}
        <Card className="bg-gradient-to-br from-chart-2/10 via-chart-2/5 to-transparent border-chart-2/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-chart-2/20 flex items-center justify-center">
                <Zap className="h-5 w-5 text-chart-2" />
              </div>
              <span className="text-2xl font-bold text-chart-2">{totalRealizado}</span>
            </div>
            <p className="text-sm font-medium text-foreground">Total Realizado</p>
            <p className="text-xs text-muted-foreground mt-1">
              de {totalMeta} planejado
            </p>
          </CardContent>
        </Card>

        {/* Metas Ativas */}
        <Card className="bg-gradient-to-br from-chart-3/10 via-chart-3/5 to-transparent border-chart-3/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-chart-3/20 flex items-center justify-center">
                <Heart className="h-5 w-5 text-chart-3" />
              </div>
              <span className="text-2xl font-bold text-chart-3">{totalMetas}</span>
            </div>
            <p className="text-sm font-medium text-foreground">Metas Ativas</p>
            <p className="text-xs text-muted-foreground mt-1">
              Configuradas para você
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart - Progress by Meta */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Progresso por Meta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart data={barChartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" domain={[0, 'dataMax']} hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={100}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  formatter={(value, name, props) => {
                    if (name === "realizado") {
                      return [`${value} de ${props.payload.meta}`, "Realizado"];
                    }
                    return [value, name];
                  }}
                />
                <Bar 
                  dataKey="realizado" 
                  radius={[0, 4, 4, 0]}
                  maxBarSize={24}
                >
                  {barChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.atingido ? "hsl(var(--chart-1))" : "hsl(var(--primary))"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Award className="h-4 w-4 text-chart-1" />
              Status das Metas
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <ChartContainer config={chartConfig} className="h-[160px] w-full">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={5}
                  dataKey="value"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-chart-1" />
                <span className="text-xs text-muted-foreground">Atingidas ({metasAtingidas})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">Em progresso ({totalMetas - metasAtingidas})</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Progress Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Detalhamento por Meta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {progress.map((p) => {
              const Icon = TIPO_ICONS[p.meta.tipo_meta] || Heart;
              const atingido = p.percentual >= 100;
              const periodoInfo = PERIODO_LABELS[p.meta.periodo] || PERIODO_LABELS.mensal;
              const progressCapped = Math.min(p.percentual, 100);
              
              const isPositive = p.variacao > 0;
              const isNegative = p.variacao < 0;

              return (
                <div 
                  key={p.meta.id}
                  className={cn(
                    "p-4 rounded-lg border transition-all",
                    atingido 
                      ? "bg-chart-1/5 border-chart-1/20" 
                      : "bg-muted/30 border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Icon + Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        atingido 
                          ? "bg-chart-1/20 text-chart-1" 
                          : "bg-primary/10 text-primary"
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm truncate">{p.meta.nome}</h4>
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium px-1.5 py-0.5 bg-muted rounded shrink-0">
                            {periodoInfo.current}
                          </span>
                          {atingido && (
                            <span className="text-[10px] font-medium text-chart-1 bg-chart-1/10 px-1.5 py-0.5 rounded shrink-0">
                              ✓ Meta
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "text-lg font-bold tabular-nums",
                            atingido && "text-chart-1"
                          )}>
                            {p.realizado}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            / {p.meta.valor_meta}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ({progressCapped.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Comparison */}
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 justify-end">
                        {isPositive && (
                          <>
                            <TrendingUp className="h-3.5 w-3.5 text-chart-1" />
                            <span className="text-sm font-medium text-chart-1">+{p.variacao.toFixed(0)}%</span>
                          </>
                        )}
                        {isNegative && (
                          <>
                            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                            <span className="text-sm font-medium text-destructive">{p.variacao.toFixed(0)}%</span>
                          </>
                        )}
                        {!isPositive && !isNegative && (
                          <>
                            <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">0%</span>
                          </>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {periodoInfo.previous}
                      </p>
                      {p.realizadoAnterior > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          ({p.realizadoAnterior} anterior)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <Progress 
                      value={progressCapped} 
                      className={cn(
                        "h-2",
                        atingido && "[&>div]:bg-chart-1"
                      )}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
