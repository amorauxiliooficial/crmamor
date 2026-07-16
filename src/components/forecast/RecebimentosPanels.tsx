import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
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

function shortDate(iso: string): string {
  const d = safeParse(iso);
  return d ? format(d, "dd/MM", { locale: ptBR }) : iso;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

interface MaeGroup {
  key: string;
  nome: string;
  tipo: string;
  total: number;
  count: number;
  refDate: string; // most recent (past) or earliest (future)
  parcelas: RecebimentoItem[];
}

function groupByMae(items: RecebimentoItem[], mode: "past" | "future"): MaeGroup[] {
  const map = new Map<string, MaeGroup>();
  for (const it of items) {
    const key = `${it.nome}__${it.tipo}`;
    const existing = map.get(key);
    if (existing) {
      existing.total += it.valor ?? 0;
      existing.count += 1;
      existing.parcelas.push(it);
    } else {
      map.set(key, {
        key,
        nome: it.nome,
        tipo: it.tipo,
        total: it.valor ?? 0,
        count: 1,
        refDate: it.data,
        parcelas: [it],
      });
    }
  }
  // sort parcelas inside each group by date
  for (const g of map.values()) {
    g.parcelas.sort((a, b) => a.data.localeCompare(b.data));
    g.refDate =
      mode === "future"
        ? g.parcelas[0].data
        : g.parcelas[g.parcelas.length - 1].data;
  }
  const list = Array.from(map.values());
  list.sort((a, b) =>
    mode === "future"
      ? a.refDate.localeCompare(b.refDate)
      : b.refDate.localeCompare(a.refDate),
  );
  return list;
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const groups = useMemo(() => groupByMae(items, mode), [items, mode]);
  const total = items.reduce((sum, i) => sum + (i.valor ?? 0), 0);

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

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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
                <p className="text-xs text-muted-foreground leading-tight">{subtitle}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-base md:text-lg font-bold tabular-nums ${accentClasses.value}`}>
                {formatBRL(total)}
              </div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {groups.length} {groups.length === 1 ? "mãe" : "mães"} · {items.length}{" "}
                {items.length === 1 ? "parcela" : "parcelas"}
              </div>
            </div>
          </div>
        </CardContent>
      </div>

      <CardContent className="p-0">
        {groups.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">{emptyLabel}</div>
        ) : (
          <ScrollArea className="h-[380px]">
            <div className="divide-y divide-border/40">
              {groups.map((g) => {
                const isOpen = expanded.has(g.key);
                return (
                  <div key={g.key}>
                    <button
                      type="button"
                      onClick={() => g.count > 1 && toggle(g.key)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        g.count > 1 ? "hover:bg-muted/40 cursor-pointer" : "cursor-default"
                      }`}
                    >
                      <div className="h-9 w-9 rounded-full bg-muted grid place-items-center text-xs font-semibold text-muted-foreground shrink-0">
                        {initials(g.nome)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs md:text-sm font-semibold truncate leading-tight">
                          {g.nome}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <Badge
                            variant="outline"
                            className="text-xs px-1.5 py-0 h-4 font-normal"
                          >
                            {g.tipo}
                          </Badge>
                          <span
                            className={`text-xs px-1.5 py-0 h-4 rounded border inline-flex items-center ${accentClasses.chip}`}
                          >
                            {g.count}× parc.
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {mode === "future" ? "1ª em " : "última "}
                            <span className="font-medium text-foreground/70">
                              {relativeLabel(g.refDate, mode)}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className={`text-sm font-bold tabular-nums ${accentClasses.value}`}>
                            {formatBRL(g.total)}
                          </div>
                          {g.count > 1 && (
                            <div className="text-xs text-muted-foreground tabular-nums">
                              {formatBRL(g.total / g.count)} / parc.
                            </div>
                          )}
                        </div>
                        {g.count > 1 && (
                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </div>
                    </button>

                    {isOpen && g.count > 1 && (
                      <div className="bg-muted/20 border-t border-border/40 px-4 py-2 space-y-1">
                        {g.parcelas.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between gap-2 py-1 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-muted-foreground tabular-nums w-10">
                                {shortDate(p.data)}
                              </span>
                              <span className="text-muted-foreground/80 truncate">
                                Parcela {p.parcela}
                              </span>
                            </div>
                            <span className={`font-semibold tabular-nums ${accentClasses.value}`}>
                              {formatBRL(p.valor)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
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
