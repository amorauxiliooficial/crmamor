import { useMemo } from "react";
import { Search, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Conversa } from "@/data/atendimentoMock";

const STATUS_COLORS: Record<string, string> = {
  Aberto: "bg-green-500",
  Pendente: "bg-yellow-500",
  Fechado: "bg-muted-foreground",
};

function formatHorario(d: Date) {
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 60) return `${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return "Ontem";
}

function slaColor(d: Date) {
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 10) return "text-green-500";
  if (diffMin <= 30) return "text-yellow-500";
  return "text-destructive";
}

type TabFilter = "nao_lidas" | "Aberto" | "Pendente" | "Fechado";

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
}: InboxSidebarProps) {
  const filtered = useMemo(() => {
    return conversas.filter((c) => {
      if (statusFilter === "nao_lidas" && c.naoLidas === 0) return false;
      if (statusFilter && statusFilter !== "nao_lidas" && c.status !== statusFilter) return false;
      if (atendenteFilter === "meus" && c.atendente !== "Você") return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(c.nome?.toLowerCase().includes(s) || c.telefone.includes(s))) return false;
      }
      return true;
    });
  }, [conversas, statusFilter, atendenteFilter, search]);

  const naoLidasCount = conversas.filter((c) => c.naoLidas > 0).length;

  return (
    <div className="w-full md:w-[340px] lg:w-[360px] shrink-0 border-r border-border flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-3 space-y-2.5 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="font-semibold text-lg">Atendimento</h1>
          <div className="flex items-center gap-1">
            <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
              ⌘K
            </kbd>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onOpenConfig}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nome ou telefone..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>

        {/* Tab filters */}
        <Tabs
          value={statusFilter ?? "all"}
          onValueChange={(v) => onStatusFilterChange(v === "all" ? null : (v as TabFilter))}
        >
          <TabsList className="w-full h-8 p-0.5">
            <TabsTrigger value="all" className="flex-1 text-xs h-7">Todas</TabsTrigger>
            <TabsTrigger value="nao_lidas" className="flex-1 text-xs h-7 gap-1">
              Não lidas
              {naoLidasCount > 0 && (
                <span className="bg-destructive text-destructive-foreground text-[9px] rounded-full px-1.5 leading-4">
                  {naoLidasCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="Aberto" className="flex-1 text-xs h-7">Abertos</TabsTrigger>
            <TabsTrigger value="Pendente" className="flex-1 text-xs h-7">Pendentes</TabsTrigger>
            <TabsTrigger value="Fechado" className="flex-1 text-xs h-7">Fechados</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Atendente chip */}
        <div className="flex gap-1.5">
          {(["todos", "meus"] as const).map((f) => (
            <button
              key={f}
              onClick={() => onAtendenteFilterChange(f)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                atendenteFilter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {f === "todos" ? "Todos" : "Meus"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma conversa</p>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              className={cn(
                "flex items-start gap-3 p-3 cursor-pointer hover:bg-accent/50 transition-colors border-b border-border/50",
                selectedId === c.id && "bg-accent border-l-2 border-l-primary"
              )}
              onClick={() => onSelect(c.id)}
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback className="text-sm font-medium bg-primary/10 text-primary">
                  {c.nome ? c.nome.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm truncate">{c.nome ?? c.telefone}</span>
                  <span className={cn("text-[11px] shrink-0 ml-2 font-medium", slaColor(c.horario))}>
                    {formatHorario(c.horario)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{c.ultimaMensagem}</p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <Badge variant="outline" className="h-5 text-[10px] px-1.5 gap-1 font-normal">
                    <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_COLORS[c.status])} />
                    {c.status}
                  </Badge>
                  <span className={cn("text-[10px]", c.atendente ? "text-muted-foreground" : "text-destructive font-medium")}>
                    {c.atendente ?? "Sem atendente"}
                  </span>
                  {c.etiquetas.map((e) => (
                    <Badge key={e} variant="secondary" className="h-5 text-[10px] px-1.5 font-normal">
                      {e}
                    </Badge>
                  ))}
                </div>
              </div>
              {c.naoLidas > 0 && (
                <Badge className="bg-destructive text-destructive-foreground h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px] shrink-0">
                  {c.naoLidas}
                </Badge>
              )}
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
