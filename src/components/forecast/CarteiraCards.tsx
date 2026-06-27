import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { CarteiraFinanceira, ComposicaoSugerida } from "@/hooks/useExecutiveForecast";

interface CarteiraProps {
  carteira: CarteiraFinanceira;
  formatBRL: (n: number) => string;
}

export function CarteiraCard({ carteira, formatBRL }: CarteiraProps) {
  const data = [
    { name: "À Vista", value: carteira.valorAVista, color: "hsl(var(--primary))" },
    { name: "Parcelado", value: carteira.valorParcelado, color: "hsl(217 91% 60%)" },
  ];

  return (
    <Card className="border-border/60 h-full">
      <CardContent className="p-4 md:p-6 space-y-4">
        <div>
          <h2 className="text-base md:text-lg font-bold tracking-tight">Carteira Financeira</h2>
          <p className="text-xs text-muted-foreground">Composição contratual atual</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 items-center">
          <div className="h-40 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {data.map((d) => (
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
                <div className="text-[10px] uppercase text-muted-foreground">Total</div>
                <div className="text-sm font-bold tabular-nums">
                  {formatBRL(carteira.totalContratado)}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <Row label="Total Contratado" value={formatBRL(carteira.totalContratado)} bold />
            <Row label="Total Recebido" value={formatBRL(carteira.totalRecebido)} accent="text-emerald-500" />
            <Row label="Total a Receber" value={formatBRL(carteira.totalAReceber)} accent="text-sky-500" />
            <div className="h-px bg-border/60 my-1" />
            <Row
              label={`À Vista (${carteira.qtdMaesAVista} mães · ${carteira.pctAVista.toFixed(0)}%)`}
              value={formatBRL(carteira.valorAVista)}
            />
            <Row
              label={`Parcelado (${carteira.qtdMaesParceladas} mães · ${carteira.pctParcelado.toFixed(0)}%)`}
              value={formatBRL(carteira.valorParcelado)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  accent,
  bold,
}: {
  label: string;
  value: string;
  accent?: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground truncate">{label}</span>
      <span className={`tabular-nums ${bold ? "font-bold" : "font-medium"} ${accent ?? ""}`}>
        {value}
      </span>
    </div>
  );
}

interface ComposicaoProps {
  composicao: ComposicaoSugerida;
  formatBRL: (n: number) => string;
}

export function ComposicaoSugeridaCard({ composicao, formatBRL }: ComposicaoProps) {
  const { gap, opcaoAVista, opcaoParcelada, opcaoMistaAVista, opcaoMistaParcelada } = composicao;

  return (
    <Card className="border-border/60 h-full">
      <CardContent className="p-4 md:p-6 space-y-3">
        <div>
          <h2 className="text-base md:text-lg font-bold tracking-tight">
            Composição sugerida p/ meta
          </h2>
          <p className="text-xs text-muted-foreground">
            Gap atual: <span className="font-semibold text-foreground">{formatBRL(gap)}</span> · ticket
            à vista {formatBRL(composicao.ticketAVista)} · parcela {formatBRL(composicao.ticketParceladoMes)}
          </p>
        </div>

        {gap <= 0 ? (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-sm text-emerald-600 dark:text-emerald-400">
            🎯 Meta projetada já está coberta.
          </div>
        ) : (
          <div className="space-y-2">
            <Option index={1} text={`${opcaoAVista} mães à vista`} />
            <Option index={2} text={`${opcaoParcelada} mães parceladas`} />
            <Option
              index={3}
              text={`${opcaoMistaAVista} mãe(s) à vista + ${opcaoMistaParcelada} parcelada(s)`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Option({ index, text }: { index: number; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2 bg-muted/30">
      <span className="h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold grid place-items-center">
        {index}
      </span>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

interface MetaProps {
  metaMes: number;
  receitaPrevista: number;
  receitaRecebida: number;
  formatBRL: (n: number) => string;
}

export function MetaMensalCard({ metaMes, receitaPrevista, receitaRecebida, formatBRL }: MetaProps) {
  const projetado = receitaRecebida + receitaPrevista;
  const pct = metaMes > 0 ? Math.min((receitaRecebida / metaMes) * 100, 999) : 0;
  const falta = Math.max(metaMes - projetado, 0);

  return (
    <Card className="border-border/60 h-full bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4 md:p-6 space-y-3">
        <div>
          <h2 className="text-base md:text-lg font-bold tracking-tight">Meta do Mês</h2>
          <p className="text-xs text-muted-foreground">Acompanhamento em tempo real</p>
        </div>

        <div>
          <div className="text-2xl font-bold tabular-nums text-primary">{formatBRL(metaMes)}</div>
          <div className="text-[11px] text-muted-foreground">Meta de receita</div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Recebido</span>
            <span className="font-semibold tabular-nums">{formatBRL(receitaRecebida)}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-pink-400 transition-all"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-muted-foreground text-right">{pct.toFixed(0)}% atingido</div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md border border-border/60 p-2">
            <div className="text-[10px] uppercase text-muted-foreground">Previsto</div>
            <div className="font-semibold tabular-nums">{formatBRL(receitaPrevista)}</div>
          </div>
          <div className="rounded-md border border-border/60 p-2">
            <div className="text-[10px] uppercase text-muted-foreground">Falta gerar</div>
            <div className="font-semibold tabular-nums text-rose-500">{formatBRL(falta)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
