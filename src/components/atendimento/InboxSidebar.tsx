import { useMemo, useState } from "react";
import { Search, Settings, User, UserCheck, Clock, Inbox, AlertTriangle, Hourglass, MessageCircle } from "lucide-react";
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
type QueueMode = "all" | "smart";

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
    <div className="space-y-1">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3.5 w-8" />
            </div>
            <Skeleton className="h-3.5 w-[75%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface SmartQueue {
  urgentes: Conversa[];
  pendentes: Conversa[];
  aguardando: Conversa[];
  outros: Conversa[];
}

function categorizeConversas(conversas: Conversa[]): SmartQueue {
  const urgentes: Conversa[] = [];
  const pendentes: Conversa[] = [];
  const aguardando: Conversa[] = [];
  const outros: Conversa[] = [];

  for (const c of conversas) {
    if (c.prioridade === "alta" || c.etiquetas.includes("Urgente")) {
      urgentes.push(c);
    } else if (c.status === "Pendente" || (c.slaMinutos != null && c.slaMinutos > 30)) {
      pendentes.push(c);
    } else if (c.status === "Aberto" && c.naoLidas === 0) {
      aguardando.push(c);
    } else {
      outros.push(c);
    }
  }

  return { urgentes, pendentes, aguardando, outros };
}

function QueueSection({ title, icon: Icon, conversas, selectedId, onSelect, hoveredId, setHoveredId, onAssume, onPendente, iconColor }: {
  title: string;
  icon: React.ElementType;
  conversas: Conversa[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  onAssume?: (id: string) => void;
  onPendente?: (id: string) => void;
  iconColor: string;
}) {
  if (conversas.length === 0) return null;

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 px-4 py-2">
        <Icon className={cn("h-3.5 w-3.5", iconColor)} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">{title}</span>
        <span className="text-[11px] font-mono text-muted-foreground/40 ml-auto">{conversas.length}</span>
      </div>
      {conversas.map((c) => (
        <ConversaItem
          key={c.id}
          conversa={c}
          isSelected={selectedId === c.id}
          isHovered={hoveredId === c.id}
          onSelect={onSelect}
          onHover={setHoveredId}
          onAssume={onAssume}
          onPendente={onPendente}
        />
      ))}
    </div>
  );
}

function ConversaItem({ conversa: c, isSelected, isHovered, onSelect, onHover, onAssume, onPendente }: {
  conversa: Conversa;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onAssume?: (id: string) => void;
  onPendente?: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all duration-150",
        isSelected
          ? "bg-primary/8 ring-1 ring-primary/15 rounded-lg mx-2"
          : "hover:bg-muted/30 mx-2 rounded-lg"
      )}
      onClick={() => onSelect(c.id)}
      onMouseEnter={() => onHover(c.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarFallback className={cn(
            "text-xs font-semibold",
            isSelected ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground"
          )}>
            {c.nome ? c.nome.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        {c.status === "Aberto" && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1.5">
          <span className={cn(
            "text-[13px] truncate",
            c.naoLidas > 0 ? "font-bold text-foreground" : "font-medium text-foreground/80"
          )}>
            {c.nome ?? c.telefone}
          </span>
          <span className="text-[11px] text-muted-foreground/50 shrink-0 tabular-nums font-mono">
            {formatHorario(c.horario)}
          </span>
        </div>

        <p className={cn(
          "text-[12px] truncate mt-0.5",
          c.naoLidas > 0 ? "text-foreground/60" : "text-muted-foreground/50"
        )}>
          {c.ultimaMensagem}
        </p>

        {/* Compact badges */}
        <div className="flex items-center gap-1.5 mt-1">
          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_DOT[c.status])} />
          {c.prioridade === "alta" && (
            <Badge variant="destructive" className="h-4 text-[9px] px-1.5 py-0 font-bold rounded-full">
              🔥
            </Badge>
          )}
          {!c.atendente && (
            <span className="text-[10px] text-primary/60 font-medium">Sem atendente</span>
          )}
          {c.slaMinutos != null && c.status !== "Fechado" && (
            <span className={cn(
              "text-[10px] font-mono font-medium tabular-nums",
              c.slaMinutos <= 5 ? "text-destructive/70" : c.slaMinutos <= 15 ? "text-amber-600/60 dark:text-amber-400/60" : "text-muted-foreground/40"
            )}>
              {c.slaMinutos}m
            </span>
          )}
          {c.etiquetas.filter(e => e !== "Urgente").slice(0, 1).map((e) => (
            <Badge
              key={e}
              variant="outline"
              className="h-4 text-[9px] px-1.5 py-0 font-medium border-border/20 text-muted-foreground/50 rounded-full"
            >
              {e}
            </Badge>
          ))}
        </div>
      </div>

      {/* Unread count */}
      {c.naoLidas > 0 && (
        <span className="bg-primary text-primary-foreground h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0">
          {c.naoLidas}
        </span>
      )}

      {/* Hover actions */}
      {isHovered && !isSelected && (onAssume || onPendente) && (
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <TooltipProvider delayDuration={100}>
            {onAssume && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="secondary" className="h-7 w-7 rounded-md"
                    onClick={(e) => { e.stopPropagation(); onAssume(c.id); }}>
                    <UserCheck className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Assumir</TooltipContent>
              </Tooltip>
            )}
            {onPendente && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="secondary" className="h-7 w-7 rounded-md"
                    onClick={(e) => { e.stopPropagation(); onPendente(c.id); }}>
                    <Clock className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">Pendente</TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      )}
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
  const [queueMode, setQueueMode] = useState<QueueMode>("smart");

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

  const smartQueue = useMemo(() => categorizeConversas(filtered), [filtered]);
  const naoLidasCount = conversas.filter((c) => c.naoLidas > 0).length;

  return (
    <div className="w-full md:w-[380px] shrink-0 border-r border-border/40 flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Inbox className="h-4 w-4 text-primary" />
            </div>
            <h1 className="font-semibold text-sm tracking-tight">Atendimento</h1>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-border/40 bg-muted/20 px-1.5 py-0.5 text-[10px] text-muted-foreground/50 font-mono">
              ⌘K
            </kbd>
            <ThemeToggle className="h-8 w-8 rounded-lg" />
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground" onClick={onOpenConfig}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-10 text-sm rounded-lg bg-muted/20 border-border/20 focus-visible:border-primary/30 transition-all"
          />
        </div>

        {/* Queue mode toggle + Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 bg-muted/20 rounded-lg p-0.5 flex-1">
            {TABS.slice(0, 4).map((tab) => {
              const isActive = (tab.value === "all" && !statusFilter) || statusFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => onStatusFilterChange(tab.value === "all" ? null : (tab.value as TabFilter))}
                  className={cn(
                    "flex-1 text-[11px] font-medium py-1 rounded-md transition-all duration-150",
                    isActive
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground/60 hover:text-foreground"
                  )}
                >
                  {tab.label}
                  {tab.value === "nao_lidas" && naoLidasCount > 0 && (
                    <span className="ml-1 bg-primary text-primary-foreground text-[9px] rounded-full px-1.5 font-bold">
                      {naoLidasCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={queueMode === "smart" ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8 rounded-lg shrink-0"
                  onClick={() => setQueueMode(queueMode === "smart" ? "all" : "smart")}
                >
                  <AlertTriangle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                {queueMode === "smart" ? "Fila inteligente ativa" : "Ativar fila inteligente"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
                "px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all border",
                chipFilter === chip.value
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-transparent text-muted-foreground/50 border-transparent hover:text-foreground hover:bg-muted/20"
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
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="h-10 w-10 rounded-xl bg-muted/20 flex items-center justify-center mb-3">
              <Search className="h-4 w-4 text-muted-foreground/30" />
            </div>
            <p className="text-xs font-medium text-muted-foreground/60">Nenhuma conversa</p>
          </div>
        ) : queueMode === "smart" ? (
          <div className="py-1">
            <QueueSection
              title="Urgentes"
              icon={AlertTriangle}
              iconColor="text-destructive/70"
              conversas={smartQueue.urgentes}
              selectedId={selectedId}
              onSelect={onSelect}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
              onAssume={onAssume}
              onPendente={onPendente}
            />
            <QueueSection
              title="Pendentes"
              icon={Hourglass}
              iconColor="text-amber-500/70"
              conversas={smartQueue.pendentes}
              selectedId={selectedId}
              onSelect={onSelect}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
              onAssume={onAssume}
              onPendente={onPendente}
            />
            <QueueSection
              title="Aguardando cliente"
              icon={MessageCircle}
              iconColor="text-muted-foreground/50"
              conversas={smartQueue.aguardando}
              selectedId={selectedId}
              onSelect={onSelect}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
              onAssume={onAssume}
              onPendente={onPendente}
            />
            <QueueSection
              title="Novos"
              icon={Inbox}
              iconColor="text-primary/60"
              conversas={smartQueue.outros}
              selectedId={selectedId}
              onSelect={onSelect}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
              onAssume={onAssume}
              onPendente={onPendente}
            />
          </div>
        ) : (
          <div className="px-1 py-1">
            {filtered.map((c) => (
              <ConversaItem
                key={c.id}
                conversa={c}
                isSelected={selectedId === c.id}
                isHovered={hoveredId === c.id}
                onSelect={onSelect}
                onHover={setHoveredId}
                onAssume={onAssume}
                onPendente={onPendente}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer stats */}
      <div className="px-4 py-2 border-t border-border/20 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground/50">{filtered.length} conversas</span>
        <div className="flex items-center gap-3">
          {smartQueue.urgentes.length > 0 && (
            <span className="text-[11px] text-destructive/60 font-medium">🔥 {smartQueue.urgentes.length}</span>
          )}
          {naoLidasCount > 0 && (
            <span className="text-[11px] text-muted-foreground/50 font-mono">{naoLidasCount} não lidas</span>
          )}
        </div>
      </div>
    </div>
  );
}
