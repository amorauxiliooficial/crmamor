import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, ResponsiveContainer, Cell, XAxis, Tooltip } from "recharts";
import { Calculator, Layers, ListChecks, Sparkles } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface DrillRecord {
  id: string;
  nome: string;
  data?: string;
  valor: number;
  meta?: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}

export interface DrillSpec {
  title: string;
  subtitle?: string;
  value: number;
  valueLabel?: string;
  accent?: string; // tailwind class for icon tile, e.g. "bg-primary/10 text-primary"
  formula: { expr: string; explain: string[]; source: string };
  composition?: { label: string; value: number; color?: string }[];
  records: DrillRecord[];
  recordsLabel?: string;
  emptyHint?: string;
}

interface Props {
  spec: DrillSpec | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  formatBRL: (n: number) => string;
}

const TONE_BADGE: Record<NonNullable<DrillRecord["tone"]>, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-emerald-500/15 text-emerald-600",
  warning: "bg-amber-500/15 text-amber-600",
  danger: "bg-rose-500/15 text-rose-600",
  info: "bg-sky-500/15 text-sky-600",
};

export function MetricDrillSheet({ spec, open, onOpenChange, formatBRL }: Props) {
  if (!spec) return null;
  const total = spec.composition?.reduce((a, b) => a + b.value, 0) ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl p-0 flex flex-col bg-gradient-to-b from-background to-accent/30"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60 space-y-3 text-left">
          <div className="flex items-start gap-3">
            <span
              className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${
                spec.accent ?? "bg-primary/10 text-primary"
              }`}
            >
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-semibold tracking-tight">
                {spec.title}
              </SheetTitle>
              {spec.subtitle && (
                <SheetDescription className="text-xs mt-0.5">
                  {spec.subtitle}
                </SheetDescription>
              )}
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                {spec.valueLabel ?? "Valor"}
              </div>
              <div className="text-3xl font-bold tabular-nums tracking-tight">
                {formatBRL(spec.value)}
              </div>
            </div>
            <Badge variant="outline" className="text-xs font-medium">
              {spec.records.length} registro{spec.records.length === 1 ? "" : "s"}
            </Badge>
          </div>
        </SheetHeader>

        <Tabs defaultValue="composicao" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4 grid grid-cols-2 h-9 bg-muted/60">
            <TabsTrigger value="composicao" className="text-xs gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Composição
            </TabsTrigger>
            <TabsTrigger value="registros" className="text-xs gap-1.5">
              <ListChecks className="h-3.5 w-3.5" />
              Registros
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-5 space-y-4">
              <TabsContent value="composicao" className="mt-0 space-y-4">

                {spec.composition && spec.composition.length > 0 ? (
                  <Card className="border-border/60">
                    <CardContent className="p-4 space-y-4">
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={spec.composition} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                            <XAxis
                              dataKey="label"
                              fontSize={10}
                              tickLine={false}
                              axisLine={false}
                              stroke="hsl(var(--muted-foreground))"
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
                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                              {spec.composition.map((c, i) => (
                                <Cell key={i} fill={c.color ?? "hsl(var(--primary))"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        {spec.composition.map((c) => {
                          const pct = total > 0 ? (c.value / total) * 100 : 0;
                          return (
                            <div key={c.label} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-2">
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ background: c.color ?? "hsl(var(--primary))" }}
                                  />
                                  <span className="font-medium">{c.label}</span>
                                </span>
                                <span className="tabular-nums font-semibold">
                                  {formatBRL(c.value)}
                                </span>
                              </div>
                              <div className="h-1 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full"
                                  style={{
                                    width: `${Math.min(pct, 100)}%`,
                                    background: c.color ?? "hsl(var(--primary))",
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <EmptyState text="Esta métrica não tem composição detalhada." />
                )}
              </TabsContent>

              <TabsContent value="registros" className="mt-0 space-y-2">
                {spec.records.length === 0 ? (
                  <EmptyState text={spec.emptyHint ?? "Nenhum registro encontrado."} />
                ) : (
                  <>
                    {spec.recordsLabel && (
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {spec.recordsLabel}
                      </p>
                    )}
                    <div className="space-y-1.5">
                      {spec.records.map((r) => (
                        <div
                          key={r.id}
                          className="rounded-lg border border-border/60 bg-card px-3 py-2.5 flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{r.nome}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {r.data && (
                                <span className="text-xs text-muted-foreground">
                                  {safeDate(r.data)}
                                </span>
                              )}
                              {r.meta && (
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded ${
                                    TONE_BADGE[r.tone ?? "default"]
                                  }`}
                                >
                                  {r.meta}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-semibold tabular-nums shrink-0">
                            {formatBRL(r.valor)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
      {text}
    </div>
  );
}

function safeDate(iso: string) {
  try {
    return format(parseISO(iso), "dd 'de' MMM", { locale: ptBR });
  } catch {
    return iso;
  }
}
