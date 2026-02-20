import { useMemo, useState } from "react";
import { Search, Settings, User, UserCheck, Clock, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import type { Conversa } from "@/data/atendimentoMock";

const STATUS_DOT: Record<string, string> = {
  Aberto: "bg-emerald-500",
  Pendente: "bg-amber-500",
  Fechado: "bg-muted-foreground/40",
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
  { value: "urgentes", label: "🔥 Urgentes" },
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
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-2.5 w-[80%]" />
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
    <div className="w-full md:w-[340px] shrink-0 border-r border-border/40 flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Inbox className="h-3.5 w-3.5 text-primary" />
            </div>
            <h1 className="font-semibold text-sm tracking-tight">Atendimento</h1>
          </div>
          <div className="flex items-center gap-0.5">
            <kbd className="hidden md:inline-flex items-center gap-0.5 rounded-md border border-border/50 bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground/60 font-mono">
              ⌘K
            </kbd>
            <ThemeToggle className="h-7 w-7 rounded-lg" />
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground" onClick={onOpenConfig}>
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            placeholder="Buscar conversa..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 text-xs rounded-lg bg-muted/30 border-border/30 focus-visible:border-primary/40 focus-visible:bg-background transition-all"
          />
        </div>

        {/* Tab filters */}
        <div className="flex gap-0.5 bg-muted/30 rounded-lg p-0.5">
          {TABS.map((tab) => {
            const isActive = (tab.value === "all" && !statusFilter) || statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => onStatusFilterChange(tab.value === "all" ? null : (tab.value as TabFilter))}
                className={cn(
                  "flex-1 text-[10px] font-medium py-1 rounded-md transition-all duration-200 relative",
                  isActive
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground/70 hover:text-foreground"
                )}
              >
                {tab.label}
                {tab.value === "nao_lidas" && naoLidasCount > 0 && (
                  <span className="ml-0.5 bg-primary text-primary-foreground text-[8px] rounded-full px-1 leading-3.5 font-bold">
                    {naoLidasCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Chips */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {CHIPS.map((chip) => (
            <button
              key={chip.value}
              onClick={() => {
                setChipFilter(chip.value);
                if (chip.value === "meus") onAtendenteFilterChange("meus");
                else onAtendenteFilterChange("todos");
              }}
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-all duration-200 border",
                chipFilter === chip.value
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-transparent text-muted-foreground/60 border-transparent hover:text-foreground hover:bg-muted/30"
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
            <div className="h-10 w-10 rounded-xl bg-muted/30 flex items-center justify-center mb-3">
              <Search className="h-4 w-4 text-muted-foreground/40" />
            </div>
            <p className="text-xs font-medium text-muted-foreground/70">Nenhuma conversa</p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">Ajuste os filtros</p>
          </div>
        ) : (
          <div className="px-2 py-1 space-y-0.5">
            {filtered.map((c) => {
              const isSelected = selectedId === c.id;
              return (
                <div
                  key={c.id}
                  className={cn(
                    "group relative flex items-center gap-2.5 px-2.5 py-2 cursor-pointer rounded-xl transition-all duration-200",
                    isSelected
                      ? "bg-primary/8 shadow-sm ring-1 ring-primary/15"
                      : "hover:bg-muted/30"
                  )}
                  onClick={() => onSelect(c.id)}
                  onMouseEnter={() => setHoveredId(c.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className={cn(
                        "text-[11px] font-semibold",
                        isSelected ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground"
                      )}>
                        {c.nome ? c.nome.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5" />}
                      </AvatarFallback>
                    </Avatar>
                    {c.status === "Aberto" && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={cn(
                        "text-xs truncate",
                        c.naoLidas > 0 ? "font-bold text-foreground" : "font-medium text-foreground/80"
                      )}>
                        {c.nome ?? c.telefone}
                      </span>
                      <span className="text-[9px] text-muted-foreground/50 shrink-0 tabular-nums font-mono">
                        {formatHorario(c.horario)}
                      </span>
                    </div>

                    <p className={cn(
                      "text-[11px] truncate mt-0.5",
                      c.naoLidas > 0 ? "text-foreground/70" : "text-muted-foreground/60"
                    )}>
                      {c.ultimaMensagem}
                    </p>

                    {/* Compact badges row */}
                    <div className="flex items-center gap-1 mt-1">
                      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_DOT[c.status])} />
                      {c.prioridade === "alta" && (
                        <Badge variant="destructive" className="h-3.5 text-[8px] px-1 py-0 font-bold rounded-full">
                          Urgente
                        </Badge>
                      )}
                      {!c.atendente && (
                        <span className="text-[9px] text-primary/70 font-medium">Sem atendente</span>
                      )}
                      {c.slaMinutos != null && c.status !== "Fechado" && (
                        <span className={cn(
                          "text-[8px] font-mono font-medium tabular-nums",
                          c.slaMinutos <= 5 ? "text-destructive/70" : c.slaMinutos <= 15 ? "text-amber-600/70 dark:text-amber-400/70" : "text-muted-foreground/40"
                        )}>
                          {c.slaMinutos}m
                        </span>
                      )}
                      {c.etiquetas.filter(e => e !== "Urgente").slice(0, 1).map((e) => (
                        <Badge
                          key={e}
                          variant="outline"
                          className="h-3.5 text-[8px] px-1 py-0 font-medium border-border/30 text-muted-foreground/60 rounded-full"
                        >
                          {e}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Unread count */}
                  {c.naoLidas > 0 && (
                    <span className="bg-primary text-primary-foreground h-4.5 min-w-4.5 px-1 flex items-center justify-center rounded-full text-[9px] font-bold shrink-0">
                      {c.naoLidas}
                    </span>
                  )}

                  {/* Hover actions */}
                  {hoveredId === c.id && !isSelected && (onAssume || onPendente) && (
                    <div
                      className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TooltipProvider delayDuration={100}>
                        {onAssume && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-6 w-6 rounded-lg"
                                onClick={(e) => { e.stopPropagation(); onAssume(c.id); }}
                              >
                                <UserCheck className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px]">Assumir</TooltipContent>
                          </Tooltip>
                        )}
                        {onPendente && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-6 w-6 rounded-lg"
                                onClick={(e) => { e.stopPropagation(); onPendente(c.id); }}
                              >
                                <Clock className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[10px]">Pendente</TooltipContent>
                          </Tooltip>
                        )}
                      </TooltipProvider>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer stats */}
      <div className="px-4 py-2 border-t border-border/30 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/50">{filtered.length} conversas</span>
        <span className="text-[10px] text-muted-foreground/50 font-mono">
          {naoLidasCount > 0 && `${naoLidasCount} não lidas`}
        </span>
      </div>
    </div>
  );
}
