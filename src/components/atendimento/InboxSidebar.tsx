import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ConversaCard } from "./ConversaCard";
import type { Conversa } from "@/data/atendimentoMock";

interface InboxSidebarProps {
  conversas: Conversa[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

type StatusFilter = "aberto" | "pendente" | "fechado";
type AtendenteFilter = "todos" | "meus";

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "aberto", label: "Aberto" },
  { value: "pendente", label: "Pendente" },
  { value: "fechado", label: "Fechado" },
];

export function InboxSidebar({ conversas, selectedId, onSelect }: InboxSidebarProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("aberto");
  const [atendenteFilter, setAtendenteFilter] = useState<AtendenteFilter>("todos");

  const filtered = conversas.filter((c) => {
    const matchesStatus = c.status === statusFilter;
    const matchesSearch =
      !search ||
      (c.nome?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      c.telefone.includes(search);
    const matchesAtendente =
      atendenteFilter === "todos" || c.atendente === "Você";
    return matchesStatus && matchesSearch && matchesAtendente;
  });

  return (
    <div className="w-[350px] shrink-0 border-r border-border flex flex-col h-full bg-card">
      {/* Search */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Status filters */}
        <div className="flex gap-1">
          {statusFilters.map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? "default" : "outline"}
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Atendente filter */}
        <div className="flex gap-1">
          {(["todos", "meus"] as AtendenteFilter[]).map((f) => (
            <Button
              key={f}
              variant={atendenteFilter === f ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() => setAtendenteFilter(f)}
            >
              {f === "todos" ? "Todos" : "Meus"}
            </Button>
          ))}
        </div>
      </div>

      {/* Conversations list */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma conversa encontrada
          </p>
        ) : (
          filtered.map((c) => (
            <ConversaCard
              key={c.id}
              conversa={c}
              selected={selectedId === c.id}
              onClick={() => onSelect(c.id)}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
}
