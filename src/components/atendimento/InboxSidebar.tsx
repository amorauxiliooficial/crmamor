import { useMemo, useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Settings, User, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  if (trimmed === "[reaction]") return "❤️ Reação";
  if (trimmed === "[unsupported]") return "⚠️ Mensagem não suportada";
  if (trimmed.startsWith("[audio]")) return `🎤 ${trimmed.slice(7).trim() || "Mensagem de voz"}`;
  if (trimmed.startsWith("[image]")) return `🖼️ ${trimmed.slice(7).trim() || "Foto"}`;
  if (trimmed.startsWith("[video]")) return `🎞️ ${trimmed.slice(7).trim() || "Vídeo"}`;
  if (trimmed.startsWith("[document]")) return `📄 ${trimmed.slice(10).trim() || "Documento"}`;
  return text;
}

function formatHorario(d: Date) {
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  if (isToday) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (isYesterday) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

type TabFilter = "nao_lidas" | "Aberto" | "Pendente" | "Fechado" | "finalizadas";

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
    <div className="space-y-0">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-[49px] w-[49px] rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3 w-[80%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

const ConversaItem = memo(function ConversaItem({ conversa: c, isSelected, onSelect }: {
  conversa: Conversa;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const contact = getContactDisplay(c.nome, c.waName, c.telefone);

  const AVATAR_COLORS = [
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  ];
  const colorIdx = Math.abs([...c.telefone].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)) % AVATAR_COLORS.length;
  const avatarColor = AVATAR_COLORS[colorIdx];
  const hasUnread = c.naoLidas > 0;

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors",
        isSelected
          ? "bg-primary/8"
          : "hover:bg-muted/15 active:bg-muted/25"
      )}
      onClick={() => onSelect(c.id)}
    >
      {/* Avatar */}
      <Avatar className="h-[46px] w-[46px] shrink-0 mt-0.5">
        <AvatarFallback className="bg-muted/20 text-muted-foreground/40">
          <User className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: Phone + Time */}
        <div className="flex items-baseline justify-between gap-2">
          <span className={cn(
            "text-[14.5px] leading-tight truncate tracking-tight",
            hasUnread ? "font-semibold text-foreground" : "font-medium text-foreground/90"
          )}>
            {contact.displayName}
          </span>
          <span className={cn(
            "text-[11px] shrink-0 tabular-nums leading-none",
            hasUnread ? "text-emerald-500 font-semibold" : "text-muted-foreground/60"
          )}>
            {formatHorario(c.horario)}
          </span>
        </div>

        {/* Row 2: Contact name (subtle) */}
        {contact.subtitle && (
          <p className="text-[12px] leading-tight text-primary/70 truncate mt-[1px]">
            {contact.subtitle}
          </p>
        )}

        {/* Row 3: Preview + Unread badge */}
        <div className="flex items-center justify-between gap-2 mt-[3px]">
          <p className={cn(
            "text-[13px] truncate leading-tight",
            hasUnread ? "text-foreground/60" : "text-muted-foreground/45"
          )}>
            {formatInboxPreview(c.ultimaMensagem)}
          </p>

          {hasUnread && (
            <span className="bg-emerald-500 text-white h-[19px] min-w-[19px] px-[5px] flex items-center justify-center rounded-full text-[10.5px] font-bold shrink-0 leading-none">
              {c.naoLidas}
            </span>
          )}
        </div>
      </div>
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
  const searchTerm = debouncedSearch ?? search;

  const filtered = useMemo(() => {
    return conversas.filter((c) => {
      // "Finalizadas" tab: show only closed
      if (statusFilter === "finalizadas") return c.status === "Fechado";
      // All other tabs: hide closed conversations
      if (c.status === "Fechado") return false;
      if (statusFilter === "nao_lidas" && c.naoLidas === 0) return false;
      if (statusFilter && statusFilter !== "nao_lidas" && c.status !== statusFilter) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        if (
          !(
            c.nome?.toLowerCase().includes(s) ||
            c.telefone.includes(s) ||
            c.ultimaMensagem.toLowerCase().includes(s)
          )
        )
          return false;
      }
      return true;
    });
  }, [conversas, statusFilter, searchTerm]);

  const naoLidasCount = conversas.filter((c) => c.naoLidas > 0 && c.status !== "Fechado").length;
  const finalizadasCount = conversas.filter((c) => c.status === "Fechado").length;

  const TABS = [
    { value: "all" as const, label: "Todas" },
    { value: "nao_lidas" as const, label: "Não lidas" },
    { value: "Aberto" as const, label: "Abertos" },
    { value: "Pendente" as const, label: "Pendentes" },
    { value: "finalizadas" as const, label: "Finalizadas" },
  ];

  return (
    <div className="w-full md:w-[380px] shrink-0 border-r border-border/20 flex flex-col h-full bg-background overflow-x-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BackToPanel />
            <h1 className="font-semibold text-[15px] tracking-tight">Conversas</h1>
          </div>
          <div className="flex items-center gap-0.5">
            <ThemeToggle className="h-8 w-8" />
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground/40" onClick={onOpenConfig}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
          <Input
            placeholder="Pesquisar ou começar uma nova conversa"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-9 text-[13px] rounded-lg bg-muted/10 border-border/10 focus-visible:border-primary/20 transition-all"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-0.5 bg-muted/10 rounded-lg p-0.5">
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
                  <span className="ml-1 bg-emerald-500 text-white text-[9px] rounded-full px-1.5 font-bold">
                    {naoLidasCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversation list — flat, WhatsApp style */}
      <div className="flex-1 overflow-y-auto">
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
        ) : (
          <div>
            {filtered.map((c) => (
              <ConversaItem
                key={c.id}
                conversa={c}
                isSelected={selectedId === c.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
