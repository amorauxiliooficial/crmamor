import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAiAgents, useCreateAiAgent, useUpdateAiAgent, useDeleteAiAgent, useSetDefaultAgent, usePublishAiAgent, type AiAgent } from "@/hooks/useAiAgents";
import { ArrowLeft, Plus, Bot, Star, Copy, Power, Trash2, Pencil, CheckCircle2, Search, MoreHorizontal, Filter, SortDesc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { AgentFormPanel } from "@/components/agentes/AgentFormDialog";

type View = { mode: "list" } | { mode: "form"; agent: AiAgent | null };
type ListFilter = "all" | "active" | "inactive" | "default";

export default function AgentesIA() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: agents, isLoading } = useAiAgents();
  const createAgent = useCreateAiAgent();
  const updateAgent = useUpdateAiAgent();
  const deleteAgent = useDeleteAiAgent();
  const setDefault = useSetDefaultAgent();
  const publishAgent = usePublishAiAgent();

  const [view, setView] = useState<View>({ mode: "list" });
  const [pendingPublish, setPendingPublish] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<ListFilter>("all");

  if (authLoading) return null;
  if (!user) { navigate("/auth"); return null; }

  const filteredAgents = useMemo(() => {
    if (!agents) return [];
    let result = [...agents];

    // Filter
    if (filter === "active") result = result.filter(a => a.is_active);
    else if (filter === "inactive") result = result.filter(a => !a.is_active);
    else if (filter === "default") result = result.filter(a => a.is_default);

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q) ||
        a.departments?.some(d => d.toLowerCase().includes(q))
      );
    }

    // Sort by updated_at desc
    result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return result;
  }, [agents, filter, searchQuery]);

  const handleSave = (data: any) => {
    if (view.mode === "form" && view.agent?.id) {
      updateAgent.mutate({ id: view.agent.id, ...data }, {
        onSuccess: (updated) => {
          toast({ title: "Agente salvo ✅" });
          if (pendingPublish && view.mode === "form" && view.agent?.id) {
            publishAgent.mutate(view.agent.id, {
              onSuccess: () => {
                toast({ title: "Agente publicado 🚀" });
                setPendingPublish(false);
                setView({ mode: "list" });
              },
              onError: () => { toast({ title: "Erro ao publicar", variant: "destructive" }); setPendingPublish(false); },
            });
          } else {
            setView({ mode: "form", agent: updated as any });
          }
        },
        onError: () => { toast({ title: "Erro ao salvar", variant: "destructive" }); setPendingPublish(false); },
      });
    } else {
      createAgent.mutate(data, {
        onSuccess: (created) => {
          toast({ title: "Agente criado ✅" });
          setView({ mode: "form", agent: created as any });
        },
        onError: () => toast({ title: "Erro ao criar", variant: "destructive" }),
      });
    }
  };

  const handlePublish = (_agentId: string) => {
    setPendingPublish(true);
  };

  const handleDuplicate = (agent: AiAgent) => {
    setView({ mode: "form", agent: { ...agent, id: "", name: `${agent.name} (cópia)`, published_config: null, published_at: null, version: 1 } as any });
  };

  const handleToggleActive = (agent: AiAgent) => {
    updateAgent.mutate({ id: agent.id, is_active: !agent.is_active }, {
      onSuccess: () => toast({ title: agent.is_active ? "Agente desativado" : "Agente ativado ✅" }),
    });
  };

  const handleSetDefault = (agent: AiAgent) => {
    setDefault.mutate(agent.id, {
      onSuccess: () => toast({ title: `${agent.name} definido como padrão ⭐` }),
    });
  };

  const handleDelete = (agent: AiAgent) => {
    if (!confirm(`Excluir agente "${agent.name}"?`)) return;
    deleteAgent.mutate(agent.id, {
      onSuccess: () => toast({ title: "Agente excluído" }),
      onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
    });
  };

  /* ── FORM VIEW ── */
  if (view.mode === "form") {
    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <AgentFormPanel
          agent={view.agent}
          onSave={handleSave}
          onPublish={handlePublish}
          onDuplicate={view.agent?.id ? () => handleDuplicate(view.agent!) : undefined}
          onCancel={() => { setView({ mode: "list" }); setPendingPublish(false); }}
          isSaving={createAgent.isPending || updateAgent.isPending}
          isPublishing={publishAgent.isPending || pendingPublish}
        />
      </div>
    );
  }

  const FILTERS: { value: ListFilter; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "active", label: "Ativos" },
    { value: "inactive", label: "Inativos" },
    { value: "default", label: "Padrão" },
  ];

  /* ── LIST VIEW ── */
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card flex items-center gap-3 px-4 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/atendimento/config")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Bot className="h-5 w-5 text-primary" />
        <h1 className="font-semibold text-base">Agentes IA</h1>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setView({ mode: "form", agent: null })}>
          <Plus className="h-4 w-4 mr-1.5" /> Novo Agente
        </Button>
      </header>

      {/* Search & Filters */}
      <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-border/30 bg-card/50">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar agente..."
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filter === f.value
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/30"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">
                {searchQuery || filter !== "all" ? "Nenhum agente encontrado" : "Nenhum agente IA configurado"}
              </p>
              {!searchQuery && filter === "all" && (
                <Button onClick={() => setView({ mode: "form", agent: null })}>
                  <Plus className="h-4 w-4 mr-1.5" /> Criar primeiro agente
                </Button>
              )}
            </div>
          ) : (
            filteredAgents.map(agent => (
              <Card
                key={agent.id}
                className={`cursor-pointer transition-all hover:shadow-sm ${!agent.is_active ? "opacity-60" : ""}`}
                onClick={() => setView({ mode: "form", agent })}
              >
                <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                  <Avatar className="h-10 w-10 sm:h-11 sm:w-11 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {agent.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-sm truncate">{agent.name}</p>
                      {agent.is_default && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                          <Star className="h-2.5 w-2.5 mr-0.5 fill-current" /> Padrão
                        </Badge>
                      )}
                      {agent.published_at ? (
                        <Badge variant="default" className="text-[9px] px-1.5 py-0 gap-0.5">
                          <CheckCircle2 className="h-2.5 w-2.5" /> v{agent.version}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">Rascunho</Badge>
                      )}
                      {!agent.is_active && <Badge variant="outline" className="text-[9px]">Inativo</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {agent.model} · {agent.tone} · {agent.max_tokens} tokens
                    </p>
                    {agent.departments?.length > 0 && (
                      <div className="flex gap-1 mt-1 overflow-hidden">
                        {agent.departments.slice(0, 3).map(d => (
                          <Badge key={d} variant="outline" className="text-[8px] px-1 py-0 shrink-0">{d}</Badge>
                        ))}
                        {agent.departments.length > 3 && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0">+{agent.departments.length - 3}</Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[100]" onClick={e => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => setView({ mode: "form", agent })}>
                        <Pencil className="h-3.5 w-3.5 mr-2" />Editar
                      </DropdownMenuItem>
                      {!agent.is_default && (
                        <DropdownMenuItem onClick={() => handleSetDefault(agent)}>
                          <Star className="h-3.5 w-3.5 mr-2" />Definir como padrão
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleDuplicate(agent)}>
                        <Copy className="h-3.5 w-3.5 mr-2" />Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(agent)}>
                        <Power className="h-3.5 w-3.5 mr-2" />{agent.is_active ? "Desativar" : "Ativar"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDelete(agent)} className="text-destructive">
                        <Trash2 className="h-3.5 w-3.5 mr-2" />Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
