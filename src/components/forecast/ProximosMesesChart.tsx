import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { ProximoMesPrev } from "@/hooks/useExecutiveForecast";

interface Props {
  data: ProximoMesPrev[];
  total: number;
  media: number;
  formatBRL: (n: number) => string;
  formatBRLShort: (n: number) => string;
}

export function ProximosMesesChart({ data, total, media, formatBRL, formatBRLShort }: Props) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base md:text-lg font-bold tracking-tight">
              Receita Prevista — Próximos 6 meses
            </h2>
            <p className="text-xs text-muted-foreground">
              Parcelas cadastradas com vencimento futuro pendente
            </p>
          </div>
          <div className="flex gap-4 text-right">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</div>
              <div className="text-sm font-semibold tabular-nums">{formatBRL(total)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Média/mês</div>
              <div className="text-sm font-semibold tabular-nums">{formatBRL(media)}</div>
            </div>
          </div>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={(v) => formatBRLShort(Number(v))}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => formatBRL(Number(v))}
              />
              <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
