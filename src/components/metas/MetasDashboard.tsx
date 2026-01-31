import { useMetasProgress } from "@/hooks/useMetas";
import { MetaProgressCard } from "./MetaProgressCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Target, TrendingUp, Settings } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface MetasDashboardProps {
  userId: string | null;
  onConfigClick?: () => void;
  isAdmin?: boolean;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];

export function MetasDashboard({ userId, onConfigClick, isAdmin }: MetasDashboardProps) {
  const { progress, loading } = useMetasProgress(userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (progress.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">Nenhuma meta configurada</p>
          {isAdmin && onConfigClick && (
            <Button variant="outline" size="sm" className="mt-4" onClick={onConfigClick}>
              <Settings className="h-4 w-4 mr-2" />
              Configurar Metas
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Calculate overall progress
  const totalMetas = progress.length;
  const metasAtingidas = progress.filter(p => p.percentual >= 100).length;
  const mediaGeral = progress.reduce((acc, p) => acc + p.percentual, 0) / totalMetas;

  // Chart data
  const barData = progress.map((p, i) => ({
    name: p.meta.nome.substring(0, 15) + (p.meta.nome.length > 15 ? "..." : ""),
    realizado: p.realizado,
    meta: p.meta.valor_meta,
    fill: COLORS[i % COLORS.length],
  }));

  const pieData = [
    { name: "Atingidas", value: metasAtingidas },
    { name: "Em progresso", value: totalMetas - metasAtingidas },
  ];

  return (
    <div className="space-y-4">
      {/* Header with overall progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Metas do Período</h3>
            <p className="text-xs text-muted-foreground">
              {metasAtingidas} de {totalMetas} metas atingidas
            </p>
          </div>
        </div>
        {isAdmin && onConfigClick && (
          <Button variant="outline" size="sm" onClick={onConfigClick}>
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </Button>
        )}
      </div>

      {/* Overall progress bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso Geral</span>
            <span className="text-sm text-muted-foreground">{mediaGeral.toFixed(0)}%</span>
          </div>
          <Progress value={mediaGeral} className="h-3" />
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Realizado vs Meta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                <Tooltip 
                  formatter={(value: number, name: string) => [value, name === "realizado" ? "Realizado" : "Meta"]}
                />
                <Bar dataKey="realizado" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="meta" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Status das Metas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  <Cell fill="hsl(var(--chart-1))" />
                  <Cell fill="hsl(var(--muted))" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Individual Meta Cards */}
      <div className="grid sm:grid-cols-2 gap-3">
        {progress.map((p) => (
          <MetaProgressCard key={p.meta.id} progress={p} />
        ))}
      </div>
    </div>
  );
}
