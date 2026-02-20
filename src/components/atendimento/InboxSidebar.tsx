import { useMemo, useState } from "react";
import { Search, Settings, User, UserCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Conversa } from "@/data/atendimentoMock";

const STATUS_DOT: Record<string, string> = {
  Aberto: "bg-emerald-500",
  Pendente: "bg-amber-500",
  Fechado: "bg-muted-foreground/50",
};

function formatHorario(d: Date) {
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "ontem";
  return `${diffD}d`;
}

function slaColor(d: Date) {
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 10) return "text-emerald-600 dark:text-emerald-400";
  if (diffMin <= 30) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

type TabFilter = "nao_lidas" | "Aberto" | "Pendente" | "Fechado";

const TABS: { value: TabFilter | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "nao_lidas", label: "Não lidas" },
  { value: "Aberto", label: "Abertos" },
  { value: "Pendente", label: "Pendentes" },
  { value: "Fechado", label: "Fechados" },
];

const CHIPS: { value: string; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "meus", label: "Meus" },
  { value: "sem_atendente", label: "Sem atendente" },
  { value: "urgentes", label: "Urgentes" },
];

interface InboxSidebarProps {
  conversas: Conversa[];
  selectedId: string | null;
  search: string;
  onSearchChange: (v: string) => void;
  onSelect: (id: string) => void;
  onOpenConfig: () => void;
  statusFilter: TabFilter | null;
  onStatusFilterChange: (v: TabFilter | null) => void;
  atendenteFilter: "todos" | "meus";
  onAtendenteFilterChange: (v: "todos" | "meus") => void;
  onAssume?: (id: string) => void;
  onPendente?: (id: string) => void;
  isLoading?: boolean;
}

function InboxSkeleton() {
  return (
    <div className="space-y-0">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-3 p-3 border-b border-border/30">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-3 w-full" />
            <div className="flex gap-1.5">
              <Skeleton className="h-4 w-14 rounded-full" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function InboxSidebar({
  conversas,
  selectedId,
  search,
  onSearchChange,
  onSelect,
  onOpenConfig,
  statusFilter,
  onStatusFilterChange,
  atendenteFilter,
  onAtendenteFilterChange,
  onAssume,
  onPendente,
  isLoading = false,
}: InboxSidebarProps) {
  const [chipFilter, setChipFilter] = useState<string>("todos");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return conversas.filter((c) => {
      if (statusFilter === "nao_lidas" && c.naoLidas === 0) return false;
      if (statusFilter && statusFilter !== "nao_lidas" && c.status !== statusFilter) return false;
      if (chipFilter === "meus" && c.atendente !== "Você") return false;
      if (chipFilter === "sem_atendente" && c.atendente !== null) return false;
      if (chipFilter === "urgentes" && !c.etiquetas.includes("Urgente")) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !(
            c.nome?.toLowerCase().includes(s) ||
            c.telefone.includes(s) ||
            c.ultimaMensagem.toLowerCase().includes(s) ||
            c.etiquetas.some((e) => e.toLowerCase().includes(s))
          )
        )
          return false;
      }
      return true;
    });
  }, [conversas, statusFilter, chipFilter, search]);

  const naoLidasCount = conversas.filter((c) => c.naoLidas > 0).length;

  return (
    <div className="w-full md:w-[340px] shrink-0 border-r border-border/60 flex flex-col h-full bg-card/80 backdrop-blur-sm">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="font-semibold text-base tracking-tight">Atendimento</h1>
          <div className="flex items-center gap-1.5">
            <kbd className="hidden md:inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
              ⌘K
            </kbd>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={onOpenConfig}>
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-sm rounded-lg bg-muted/40 border-border/40 focus-visible:bg-background transition-colors"
          />
        </div>

        {/* Tab filters */}
        <div className="flex gap-0.5 bg-muted/40 rounded-lg p-0.5">
          {TABS.map((tab) => {
            const isActive = (tab.value === "all" && !statusFilter) || statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => onStatusFilterChange(tab.value === "all" ? null : (tab.value as TabFilter))}
                className={cn(
                  "flex-1 text-[11px] font-medium py-1.5 rounded-md transition-all duration-200 relative",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {tab.value === "nao_lidas" && naoLidasCount > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground text-[9px] rounded-full px-1 leading-4 font-bold">
                    {naoLidasCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Chips */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => {
                setChipFilter(chip.value);
                if (chip.value === "meus") onAtendenteFilterChange("meus");
                else onAtendenteFilterChange("todos");
              }}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-200 border",
                chipFilter === chip.value
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-transparent text-muted-foreground border-border/40 hover:border-border hover:text-foreground"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <InboxSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Search className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Nenhuma conversa</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Tente ajustar os filtros</p>
          </div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-all duration-150",
                "hover:bg-accent/30",
                selectedId === c.id
                  ? "bg-primary/5 border-l-2 border-l-primary"
                  : "border-l-2 border-l-transparent"
              )}
              onClick={() => onSelect(c.id)}
              onMouseEnter={() => setHoveredId(c.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-xs font-semibold bg-primary/8 text-primary">
                    {c.nome ? c.nome.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                {/* Online dot */}
                {c.status === "Aberto" && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn(
                    "text-sm truncate",
                    c.naoLidas > 0 ? "font-bold" : "font-medium"
                  )}>
                    {c.nome ?? c.telefone}
                  </span>
                  <span className={cn("text-[10px] shrink-0 tabular-nums", slaColor(c.horario))}>
                    {formatHorario(c.horario)}
                  </span>
                </div>

                <p className={cn(
                  "text-xs truncate mt-0.5 leading-relaxed",
                  c.naoLidas > 0 ? "text-foreground/80 font-medium" : "text-muted-foreground"
                )}>
                  {c.ultimaMensagem}
                </p>

                {/* Badges row */}
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_DOT[c.status])} />
                  <span className="text-[10px] text-muted-foreground">{c.status}</span>
                  {!c.atendente && (
                    <span className="text-[10px] text-destructive font-medium">• Sem atendente</span>
                  )}
                  {c.prioridade === "alta" && (
                    <Badge
                      variant="destructive"
                      className="h-4 text-[9px] px-1.5 py-0 font-bold animate-pulse"
                    >
                      🔥 Urgente
                    </Badge>
                  )}
                  {c.slaMinutos != null && c.status !== "Fechado" && (
                    <span className={cn(
                      "text-[9px] font-mono font-medium tabular-nums",
                      c.slaMinutos <= 5 ? "text-destructive" : c.slaMinutos <= 15 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/60"
                    )}>
                      SLA {c.slaMinutos}m
                    </span>
                  )}
                  {c.etiquetas.filter(e => e !== "Urgente" || c.prioridade !== "alta").slice(0, 2).map((e) => (
                    <Badge
                      key={e}
                      variant="outline"
                      className={cn(
                        "h-4 text-[9px] px-1.5 py-0 font-medium border-border/40",
                        e === "Urgente" && "border-destructive/30 text-destructive bg-destructive/5"
                      )}
                    >
                      {e}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Unread badge */}
              {c.naoLidas > 0 && (
                <span className="absolute top-3 right-4 bg-primary text-primary-foreground h-5 min-w-5 px-1 flex items-center justify-center rounded-full text-[10px] font-bold">
                  {c.naoLidas}
                </span>
              )}

              {/* Hover actions */}
              {hoveredId === c.id && (onAssume || onPendente) && (
                <div
                  className="absolute right-3 bottom-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <TooltipProvider delayDuration={100}>
                    {onAssume && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-6 w-6 rounded-md"
                            onClick={(e) => { e.stopPropagation(); onAssume(c.id); }}
                          >
                            <UserCheck className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">Assumir</TooltipContent>
                      </Tooltip>
                    )}
                    {onPendente && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-6 w-6 rounded-md"
                            onClick={(e) => { e.stopPropagation(); onPendente(c.id); }}
                          >
                            <Clock className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">Pendente</TooltipContent>
                      </Tooltip>
                    )}
                  </TooltipProvider>
                </div>
              )}
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
