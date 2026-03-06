import { useMemo, useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Settings, User, UserCheck, Clock, Inbox, AlertTriangle, MessageCircle, ArrowLeft, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { getContactDisplay } from "@/lib/contactDisplay";
import type { Conversa } from "@/data/atendimentoMock";

function formatInboxPreview(text: string): string {
  const trimmed = text.trim();
  if (trimmed === "[audio]") return "🎤 Mensagem de voz";
  if (trimmed === "[image]") return "🖼️ Foto";
  if (trimmed === "[video]") return "🎞️ Vídeo";
  if (trimmed === "[document]") return "📄 Documento";
  if (trimmed === "[sticker]") return "🎨 Figurinha";
  if (trimmed.startsWith("[audio]")) return `🎤 ${trimmed.slice(7).trim() || "Mensagem de voz"}`;
  if (trimmed.startsWith("[image]")) return `🖼️ ${trimmed.slice(7).trim() || "Foto"}`;
  if (trimmed.startsWith("[video]")) return `🎞️ ${trimmed.slice(7).trim() || "Vídeo"}`;
  if (trimmed.startsWith("[document]")) return `📄 ${trimmed.slice(10).trim() || "Documento"}`;
  return text;
}

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
];

interface InboxSidebarProps {
  conversas: Conversa[];
  selectedId: string | null;
  search: string;
  onSearchChange: (v: string) => void;
  debouncedSearch?: string;
  onSelect: (id: string) => void;
  onOpenConfig: () => void;
  statusFilter: TabFilter | null;
  onStatusFilterChange: (v: TabFilter | null) => void;
  atendenteFilter: "todos" | "meus";
  onAtendenteFilterChange: (v: "todos" | "meus") => void;
  onAssume?: (id: string) => void;
  onPendente?: (id: string) => void;
  isLoading?: boolean;
  onStartAtendimento?: (id: string) => void;
}

function InboxSkeleton() {
  return (
    <div className="space-y-0.5">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-3 w-[75%]" />
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
    } else if (c.queueStatus === "novo") {
      pendentes.push(c);
    } else if (c.queueStatus === "aguardando_cliente") {
      aguardando.push(c);
    } else {
      outros.push(c);
    }
  }

  return { urgentes, pendentes, aguardando, outros };
}

function QueueSection({ title, icon: Icon, conversas, selectedId, onSelect, hoveredId, setHoveredId, onAssume, onPendente, onStartAtendimento, iconColor }: {
  title: string;
  icon: React.ElementType;
  conversas: Conversa[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  onAssume?: (id: string) => void;
  onPendente?: (id: string) => void;
  onStartAtendimento?: (id: string) => void;
  iconColor: string;
}) {
  if (conversas.length === 0) return null;

  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 px-4 py-2">
        <Icon className={cn("h-3 w-3", iconColor)} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">{title}</span>
        <span className="text-[10px] font-mono text-muted-foreground/25 ml-auto">{conversas.length}</span>
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
          onStartAtendimento={onStartAtendimento}
        />
      ))}
    </div>
  );
}

const ConversaItem = memo(function ConversaItem({ conversa: c, isSelected, isHovered, onSelect, onHover, onAssume, onPendente, onStartAtendimento }: {
  conversa: Conversa;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onAssume?: (id: string) => void;
  onPendente?: (id: string) => void;
  onStartAtendimento?: (id: string) => void;
}) {
  const contact = getContactDisplay(c.nome, c.waName, c.telefone);

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all duration-100",
        isSelected
          ? "bg-primary/6 rounded-lg mx-2"
          : "hover:bg-muted/20 active:bg-muted/30 mx-2 rounded-lg"
      )}
      onClick={() => onSelect(c.id)}
      onMouseEnter={() => onHover(c.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarFallback className={cn(
            "text-sm font-medium",
            isSelected ? "bg-primary/10 text-primary" : "bg-muted/25 text-muted-foreground/70"
          )}>
            {contact.initials === "#" ? <User className="h-4 w-4" /> : contact.initials}
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
            c.naoLidas > 0 ? "font-semibold text-foreground" : "font-medium text-foreground/70"
          )}>
            {contact.displayName}
          </span>
          <span className="text-[10px] text-muted-foreground/35 shrink-0 tabular-nums font-mono">
            {formatHorario(c.horario)}
          </span>
        </div>

        {contact.subtitle && (
          <p className="text-[10px] text-muted-foreground/40 truncate">{contact.subtitle}</p>
        )}

        <p className={cn(
          "text-[12px] truncate mt-0.5",
          c.naoLidas > 0 ? "text-foreground/50" : "text-muted-foreground/40"
        )}>
          {formatInboxPreview(c.ultimaMensagem)}
        </p>

        {/* Minimal metadata — show "Novo" for unassigned */}
        {c.queueStatus === "novo" && (
          <span className="text-[10px] text-primary font-medium mt-0.5 block">Disponível na fila</span>
        )}
      </div>

      {/* Unread count */}
      {c.naoLidas > 0 && (
        <span className="bg-primary text-primary-foreground h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0">
          {c.naoLidas}
        </span>
      )}

      {/* CTA for new conversations or hover actions */}
      {c.queueStatus === "novo" && onStartAtendimento ? (
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            size="sm"
            className="h-7 rounded-lg text-[11px] gap-1.5 px-3"
            onClick={(e) => { e.stopPropagation(); onStartAtendimento(c.id); }}
          >
            <Play className="h-3 w-3" />
            Iniciar
          </Button>
        </div>
      ) : isHovered && !isSelected && (onAssume || onPendente) ? (
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
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
      ) : null}
    </div>
  );
});

function BackToPanel() {
  const navigate = useNavigate();
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground/50"
            onClick={() => navigate("/")}
            aria-label="Voltar ao painel"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Voltar ao painel</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function InboxSidebar({
  conversas,
  selectedId,
  search,
  onSearchChange,
  debouncedSearch,
  onSelect,
  onOpenConfig,
  statusFilter,
  onStatusFilterChange,
  atendenteFilter,
  onAtendenteFilterChange,
  onAssume,
  onPendente,
  isLoading = false,
  onStartAtendimento,
}: InboxSidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [queueMode, setQueueMode] = useState<QueueMode>("smart");

  const searchTerm = debouncedSearch ?? search;

  const filtered = useMemo(() => {
    return conversas.filter((c) => {
      if (statusFilter === "nao_lidas" && c.naoLidas === 0) return false;
      if (statusFilter && statusFilter !== "nao_lidas" && c.status !== statusFilter) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
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
  }, [conversas, statusFilter, searchTerm]);

  const smartQueue = useMemo(() => categorizeConversas(filtered), [filtered]);
  const naoLidasCount = conversas.filter((c) => c.naoLidas > 0).length;

  return (
    <div className="w-full md:w-[380px] shrink-0 border-r border-border/20 flex flex-col h-full bg-background overflow-x-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BackToPanel />
            <h1 className="font-semibold text-[14px] tracking-tight">Atendimento</h1>
          </div>
          <div className="flex items-center gap-0.5">
            <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-border/20 bg-muted/10 px-1.5 py-0.5 text-[9px] text-muted-foreground/30 font-mono">
              ⌘K
            </kbd>
            <ThemeToggle className="h-8 w-8 rounded-lg" />
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground/40" onClick={onOpenConfig}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 text-[13px] rounded-lg bg-muted/10 border-border/10 focus-visible:border-primary/20 transition-all"
          />
        </div>

        {/* Tabs only — no chips */}
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5 bg-muted/10 rounded-lg p-0.5 flex-1">
            {TABS.map((tab) => {
              const isActive = (tab.value === "all" && !statusFilter) || statusFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => onStatusFilterChange(tab.value === "all" ? null : (tab.value as TabFilter))}
                  className={cn(
                    "flex-1 text-[11px] font-medium py-1.5 rounded-md transition-all duration-100",
                    isActive
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground/40 hover:text-foreground/70"
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
                  <AlertTriangle className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                {queueMode === "smart" ? "Fila inteligente" : "Ativar fila inteligente"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <InboxSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="h-10 w-10 rounded-xl bg-muted/10 flex items-center justify-center mb-3">
              <Search className="h-4 w-4 text-muted-foreground/20" />
            </div>
            <p className="text-[13px] font-medium text-muted-foreground/40">Nenhuma conversa</p>
            <p className="text-[11px] text-muted-foreground/25 mt-0.5">Tente outro filtro</p>
          </div>
        ) : queueMode === "smart" ? (
          <div className="py-0.5">
            <QueueSection title="Urgentes" icon={AlertTriangle} iconColor="text-destructive/50" conversas={smartQueue.urgentes} selectedId={selectedId} onSelect={onSelect} hoveredId={hoveredId} setHoveredId={setHoveredId} onAssume={onAssume} onPendente={onPendente} onStartAtendimento={onStartAtendimento} />
            <QueueSection title="Novos na fila" icon={Inbox} iconColor="text-primary" conversas={smartQueue.pendentes} selectedId={selectedId} onSelect={onSelect} hoveredId={hoveredId} setHoveredId={setHoveredId} onAssume={onAssume} onPendente={onPendente} onStartAtendimento={onStartAtendimento} />
            <QueueSection title="Aguardando cliente" icon={MessageCircle} iconColor="text-muted-foreground/35" conversas={smartQueue.aguardando} selectedId={selectedId} onSelect={onSelect} hoveredId={hoveredId} setHoveredId={setHoveredId} onAssume={onAssume} onPendente={onPendente} onStartAtendimento={onStartAtendimento} />
            <QueueSection title="Em atendimento" icon={UserCheck} iconColor="text-muted-foreground/35" conversas={smartQueue.outros} selectedId={selectedId} onSelect={onSelect} hoveredId={hoveredId} setHoveredId={setHoveredId} onAssume={onAssume} onPendente={onPendente} onStartAtendimento={onStartAtendimento} />
          </div>
        ) : (
          <div className="px-1 py-0.5">
            {filtered.map((c) => (
              <ConversaItem key={c.id} conversa={c} isSelected={selectedId === c.id} isHovered={hoveredId === c.id} onSelect={onSelect} onHover={setHoveredId} onAssume={onAssume} onPendente={onPendente} onStartAtendimento={onStartAtendimento} />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer stats — minimal */}
      <div className="px-4 py-2 border-t border-border/10 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/30">{filtered.length} conversas</span>
        {naoLidasCount > 0 && (
          <span className="text-[10px] text-muted-foreground/30 font-mono">{naoLidasCount} não lidas</span>
        )}
      </div>
    </div>
  );
}
