import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Wallet } from "lucide-react";
import type { CarteiraFinanceira } from "@/hooks/useExecutiveForecast";

export type CarteiraSegmentId = "avista" | "parcelado" | "recebido" | "areceber";

interface Props {
  carteira: CarteiraFinanceira;
  formatBRL: (n: number) => string;
  onSegmentClick?: (id: CarteiraSegmentId) => void;
}

const COLOR_AVISTA = "hsl(var(--primary))";
const COLOR_PARCELADO = "hsl(217 91% 60%)";
const COLOR_RECEBIDO = "hsl(142 70% 45%)";
const COLOR_RECEBER = "hsl(38 92% 55%)";

export function CarteiraDonutCard({ carteira, formatBRL }: Props) {
  const donut = [
    { name: "À Vista", value: carteira.valorAVista, color: COLOR_AVISTA },
    { name: "Parcelado", value: carteira.valorParcelado, color: COLOR_PARCELADO },
  ];
  const segments = [
    {
      label: "À Vista",
      qtd: carteira.qtdMaesAVista,
      valor: carteira.valorAVista,
      pct: carteira.pctAVista,
      color: COLOR_AVISTA,
    },
    {
      label: "Parcelado",
      qtd: carteira.qtdMaesParceladas,
      valor: carteira.valorParcelado,
      pct: carteira.pctParcelado,
      color: COLOR_PARCELADO,
    },
    {
      label: "Recebido",
      qtd: null as number | null,
      valor: carteira.totalRecebido,
      pct: carteira.pctRecebido,
      color: COLOR_RECEBIDO,
    },
    {
      label: "A Receber",
      qtd: null as number | null,
      valor: carteira.totalAReceber,
      pct: carteira.pctAReceber,
      color: COLOR_RECEBER,
    },
  ];

  return (
    <Card className="border-border/60 h-full">
      <CardContent className="p-5 md:p-7 space-y-5">
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Wallet className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Carteira Financeira</h2>
            <p className="text-xs text-muted-foreground">Composição contratual</p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-[180px_1fr] items-center">
          <div className="h-44 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donut}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={78}
                  paddingAngle={3}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {donut.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatBRL(Number(v))}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Contratado
                </div>
                <div className="text-base font-bold tabular-nums">
                  {formatBRL(carteira.totalContratado)}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {segments.map((s) => (
              <div key={s.label} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="font-medium truncate">
                      {s.label}
                      {s.qtd !== null && (
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          · {s.qtd} {s.qtd === 1 ? "mãe" : "mães"}
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="tabular-nums font-semibold">{formatBRL(s.valor)}</span>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${Math.min(s.pct, 100)}%`, background: s.color }}
                  />
                </div>
                <div className="text-[10px] text-muted-foreground tabular-nums text-right">
                  {s.pct.toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60">
          <Mini label="Total contratado" value={formatBRL(carteira.totalContratado)} />
          <Mini label="Total recebido" value={formatBRL(carteira.totalRecebido)} tone="success" />
          <Mini label="Total a receber" value={formatBRL(carteira.totalAReceber)} tone="info" />
        </div>
      </CardContent>
    </Card>
  );
}

function Mini({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "info";
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={`text-sm font-bold tabular-nums ${
          tone === "success" ? "text-emerald-500" : tone === "info" ? "text-sky-500" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
