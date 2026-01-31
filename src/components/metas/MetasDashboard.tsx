import { useMetasProgress } from "@/hooks/useMetas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Target, TrendingUp, Settings, Award, Flame, Zap } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { cn } from "@/lib/utils";

interface MetasDashboardProps {
  userId: string | null;
  onConfigClick?: () => void;
  isAdmin?: boolean;
}

const COLORS = {
  primary: "hsl(var(--primary))",
  chart1: "hsl(var(--chart-1))",
  chart2: "hsl(var(--chart-2))",
  chart3: "hsl(var(--chart-3))",
  muted: "hsl(var(--muted))",
};

export function MetasDashboard({ userId, onConfigClick, isAdmin }: MetasDashboardProps) {
  const { progress, loading } = useMetasProgress(userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (progress.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Target className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhuma meta configurada</p>
          {isAdmin && onConfigClick && (
            <Button variant="outline" size="sm" className="mt-3" onClick={onConfigClick}>
              <Settings className="h-3.5 w-3.5 mr-1.5" />
              Configurar Metas
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Calculations
  const totalMetas = progress.length;
  const metasAtingidas = progress.filter(p => p.percentual >= 100).length;
  const mediaGeral = progress.reduce((acc, p) => acc + Math.min(p.percentual, 100), 0) / totalMetas;
  const totalRealizado = progress.reduce((acc, p) => acc + p.realizado, 0);
  const totalMeta = progress.reduce((acc, p) => acc + p.meta.valor_meta, 0);

  // Pie chart data
  const pieData = progress.map((p, i) => ({
    name: p.meta.nome,
    value: p.realizado,
    fill: [COLORS.primary, COLORS.chart1, COLORS.chart2, COLORS.chart3][i % 4],
  }));

  // Area chart data (simulated trend)
  const areaData = progress.map((p) => ({
    name: p.meta.nome.substring(0, 8),
    realizado: p.realizado,
    meta: p.meta.valor_meta,
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-chart-1 flex items-center justify-center">
            <Target className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Metas & Performance</h3>
            <p className="text-[11px] text-muted-foreground">
              {metasAtingidas}/{totalMetas} concluídas
            </p>
          </div>
        </div>
        {isAdmin && onConfigClick && (
          <Button variant="ghost" size="sm" onClick={onConfigClick} className="h-8 px-2">
            <Settings className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Overall Progress */}
        <Card className="col-span-2 md:col-span-1 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Progresso</span>
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">{mediaGeral.toFixed(0)}%</p>
            <Progress value={mediaGeral} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        {/* Achieved Goals */}
        <Card className={cn(
          "border-chart-1/20",
          metasAtingidas > 0 && "bg-gradient-to-br from-chart-1/10 to-chart-1/5"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Atingidas</span>
              <Award className="h-4 w-4 text-chart-1" />
            </div>
            <p className="text-2xl font-bold">{metasAtingidas}</p>
            <p className="text-[10px] text-muted-foreground mt-1">de {totalMetas} metas</p>
          </CardContent>
        </Card>

        {/* Total Realized */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Realizado</span>
              <TrendingUp className="h-4 w-4 text-chart-2" />
            </div>
            <p className="text-2xl font-bold">{totalRealizado}</p>
            <p className="text-[10px] text-muted-foreground mt-1">de {totalMeta} total</p>
          </CardContent>
        </Card>

        {/* Streak/Momentum */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Em progresso</span>
              <Flame className="h-4 w-4 text-chart-3" />
            </div>
            <p className="text-2xl font-bold">{totalMetas - metasAtingidas}</p>
            <p className="text-[10px] text-muted-foreground mt-1">metas ativas</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-3 gap-3">
        {/* Area Chart */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Realizado vs Meta</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pr-4 pb-4">
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={areaData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRealizado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10 }} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    fontSize: 11, 
                    borderRadius: 8,
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="meta" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  fill="none"
                />
                <Area 
                  type="monotone" 
                  dataKey="realizado" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRealizado)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader className="pb-0 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Distribuição</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    fontSize: 11, 
                    borderRadius: 8,
                    border: '1px solid hsl(var(--border))',
                    backgroundColor: 'hsl(var(--card))'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Individual Meta Progress - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {progress.map((p, i) => {
          const atingido = p.percentual >= 100;
          const colors = ["primary", "chart-1", "chart-2", "chart-3"];
          const colorClass = colors[i % colors.length];
          
          return (
            <div 
              key={p.meta.id}
              className={cn(
                "p-3 rounded-lg border transition-all",
                atingido 
                  ? "bg-chart-1/10 border-chart-1/30" 
                  : "bg-card hover:bg-muted/30"
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium truncate pr-2">{p.meta.nome}</span>
                {atingido && <Award className="h-3 w-3 text-chart-1 shrink-0" />}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold">{p.realizado}</span>
                <span className="text-[10px] text-muted-foreground">/{p.meta.valor_meta}</span>
              </div>
              <Progress 
                value={Math.min(p.percentual, 100)} 
                className={cn(
                  "h-1 mt-2",
                  atingido && "[&>div]:bg-chart-1"
                )}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
