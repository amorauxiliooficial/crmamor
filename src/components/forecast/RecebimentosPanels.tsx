import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowDownCircle,
  CalendarClock,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  format,
  parseISO,
  isToday,
  isTomorrow,
  isYesterday,
  differenceInCalendarDays,
  startOfDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { RecebimentoItem } from "@/hooks/useExecutiveForecast";

interface Props {
  ultimas: RecebimentoItem[];
  proximos: RecebimentoItem[];
  formatBRL: (n: number) => string;
}

function safeParse(iso: string): Date | null {
  try {
    return parseISO(iso);
  } catch {
    return null;
  }
}

function relativeLabel(iso: string, mode: "past" | "future"): string {
  const d = safeParse(iso);
  if (!d) return iso;
  if (isToday(d)) return "Hoje";
  if (mode === "future" && isTomorrow(d)) return "Amanhã";
  if (mode === "past" && isYesterday(d)) return "Ontem";
  const diff = differenceInCalendarDays(d, startOfDay(new Date()));
  if (mode === "future" && diff > 0 && diff <= 7) return `Em ${diff} dias`;
  if (mode === "past" && diff < 0 && diff >= -7) return `Há ${Math.abs(diff)} dias`;
  return format(d, "dd 'de' MMM", { locale: ptBR });
}

function fullDate(iso: string): string {
  const d = safeParse(iso);
  return d ? format(d, "dd/MM/yyyy", { locale: ptBR }) : iso;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function groupByDate(items: RecebimentoItem[]) {
  const groups = new Map<string, RecebimentoItem[]>();
  for (const it of items) {
    const key = it.data?.slice(0, 10) ?? "sem-data";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(it);
  }
  return Array.from(groups.entries());
}

interface PanelProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: "emerald" | "primary";
  items: RecebimentoItem[];
  mode: "past" | "future";
  formatBRL: (n: number) => string;
  emptyLabel: string;
}

function Panel({
  title,
  subtitle,
  icon,
  accent,
  items,
  mode,
  formatBRL,
  emptyLabel,
}: PanelProps) {
  const total = items.reduce((sum, i) => sum + (i.valor ?? 0), 0);
  const groups = groupByDate(items);

  const accentClasses =
    accent === "emerald"
      ? {
          ring: "ring-emerald-500/20",
          gradient: "from-emerald-500/10 via-transparent to-transparent",
          iconBg: "bg-emerald-500/10 text-emerald-500",
          value: "text-emerald-500",
          chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        }
      : {
          ring: "ring-primary/20",
          gradient: "from-primary/10 via-transparent to-transparent",
          iconBg: "bg-primary/10 text-primary",
          value: "text-foreground",
          chip: "bg-primary/10 text-primary border-primary/20",
        };

  return (
    <Card className={`border-border/60 ring-1 ${accentClasses.ring} overflow-hidden`}>
      <div className={`bg-gradient-to-br ${accentClasses.gradient} border-b border-border/40`}>
        <CardContent className="p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`h-10 w-10 rounded-xl grid place-items-center ${accentClasses.iconBg}`}>
                {icon}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm md:text-base font-bold tracking-tight leading-tight">
                  {title}
                </h2>
                <p className="text-[11px] text-muted-foreground leading-tight">{subtitle}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-base md:text-lg font-bold tabular-nums ${accentClasses.value}`}>
                {formatBRL(total)}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {items.length} {items.length === 1 ? "parcela" : "parcelas"}
              </div>
            </div>
          </div>
        </CardContent>
      </div>

      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">{emptyLabel}</div>
        ) : (
          <ScrollArea className="h-[360px]">
            <div className="divide-y divide-border/40">
              {groups.map(([dateKey, list]) => {
                const groupTotal = list.reduce((s, i) => s + (i.valor ?? 0), 0);
                return (
                  <div key={dateKey}>
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/30 sticky top-0 backdrop-blur-sm z-10">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {relativeLabel(dateKey, mode)}
                        </span>
                        <span className="text-[10px] text-muted-foreground/70">
                          {fullDate(dateKey)}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                        {formatBRL(groupTotal)}
                      </span>
                    </div>
                    {list.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                      >
                        <div className="h-8 w-8 rounded-full bg-muted grid place-items-center text-[11px] font-semibold text-muted-foreground shrink-0">
                          {initials(r.nome)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium truncate">{r.nome}</div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 h-4 font-normal"
                            >
                              {r.tipo}
                            </Badge>
                            <span
                              className={`text-[9px] px-1.5 py-0 h-4 rounded border inline-flex items-center ${accentClasses.chip}`}
                            >
                              {r.parcela}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`text-xs font-bold tabular-nums shrink-0 ${accentClasses.value}`}
                        >
                          {formatBRL(r.valor)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export function RecebimentosPanels({ ultimas, proximos, formatBRL }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel
        title="Últimas Entradas"
        subtitle="Receitas confirmadas recentemente"
        icon={<CheckCircle2 className="h-5 w-5" />}
        accent="emerald"
        items={ultimas}
        mode="past"
        formatBRL={formatBRL}
        emptyLabel="Nenhuma entrada registrada."
      />
      <Panel
        title="Próximos Recebimentos"
        subtitle="Parcelas a vencer nos próximos dias"
        icon={<CalendarClock className="h-5 w-5" />}
        accent="primary"
        items={proximos}
        mode="future"
        formatBRL={formatBRL}
        emptyLabel="Nenhuma parcela prevista."
      />
    </div>
  );
}
