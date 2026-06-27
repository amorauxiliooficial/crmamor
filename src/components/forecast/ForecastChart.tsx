import { Card, CardContent } from "@/components/ui/card";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { AlertTriangle, TrendingUp } from "lucide-react";
import type { ForecastMesItem } from "@/hooks/useExecutiveForecast";

interface Props {
  data: ForecastMesItem[];
  metaMes: number;
  formatBRL: (n: number) => string;
  formatBRLShort: (n: number) => string;
  onMonthClick?: (month: ForecastMesItem) => void;
}

export function ForecastChart({ data, metaMes, formatBRL, formatBRLShort, onMonthClick }: Props) {
  const mediaTotal = data.length ? data.reduce((a, b) => a + b.total, 0) / data.length : 0;
  const mesesRisco = data.filter((d) => d.abaixoMeta).length;

  return (
    <Card className="border-border/60">
      <CardContent className="p-5 md:p-7 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
                <TrendingUp className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-semibold tracking-tight">Forecast Financeiro</h2>
            </div>
            <p className="text-xs text-muted-foreground ml-10">
              Próximos 6 meses · receita garantida, prevista e meta
            </p>
          </div>
          <div className="flex items-center gap-6 text-right">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Média/mês</div>
              <div className="text-sm font-semibold tabular-nums">{formatBRL(mediaTotal)}</div>
            </div>
            {mesesRisco > 0 && (
              <div className="flex items-center gap-1.5 text-rose-500">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">
                  {mesesRisco} {mesesRisco === 1 ? "mês" : "meses"} em risco
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatBRLShort(Number(v))}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 10,
                  fontSize: 12,
                  boxShadow: "0 8px 24px hsl(var(--foreground) / 0.08)",
                }}
                formatter={(v: number, name: string) => [formatBRL(Number(v)), name]}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
              />
              {metaMes > 0 && (
                <ReferenceLine
                  y={metaMes}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: "Meta",
                    position: "right",
                    fill: "hsl(var(--primary))",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
              )}
              <Bar
                dataKey="recebido"
                stackId="receita"
                name="Garantida"
                fill="hsl(142 70% 45%)"
                radius={[0, 0, 0, 0]}
                cursor={onMonthClick ? "pointer" : undefined}
                onClick={(d: any) => onMonthClick?.(d.payload as ForecastMesItem)}
              />
              <Bar
                dataKey="pendente"
                stackId="receita"
                name="Prevista"
                fill="hsl(217 91% 60%)"
                radius={[6, 6, 0, 0]}
                cursor={onMonthClick ? "pointer" : undefined}
                onClick={(d: any) => onMonthClick?.(d.payload as ForecastMesItem)}
              />
              <Line
                type="monotone"
                dataKey="total"
                name="Tendência"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
