import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAiAgents, useCreateAiAgent, useUpdateAiAgent, useDeleteAiAgent, useSetDefaultAgent, type AiAgent } from "@/hooks/useAiAgents";
import { ArrowLeft, Plus, Bot, Star, Copy, Power, Trash2, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AgentFormDialog } from "@/components/agentes/AgentFormDialog";

export default function AgentesIA() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: agents, isLoading } = useAiAgents();
  const createAgent = useCreateAiAgent();
  const updateAgent = useUpdateAiAgent();
  const deleteAgent = useDeleteAiAgent();
  const setDefault = useSetDefaultAgent();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AiAgent | null>(null);

  if (authLoading) return null;
  if (!user) { navigate("/auth"); return null; }

  const handleCreate = () => {
    setEditingAgent(null);
    setDialogOpen(true);
  };

  const handleEdit = (agent: AiAgent) => {
    setEditingAgent(agent);
    setDialogOpen(true);
  };

  const handleDuplicate = (agent: AiAgent) => {
    const { id, created_at, updated_at, is_default, ...rest } = agent;
    setEditingAgent({ ...agent, id: "", name: `${agent.name} (cópia)` } as any);
    setDialogOpen(true);
  };

  const handleSave = (data: any) => {
    if (editingAgent?.id) {
      updateAgent.mutate({ id: editingAgent.id, ...data }, {
        onSuccess: () => { toast({ title: "Agente atualizado ✅" }); setDialogOpen(false); },
        onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
      });
    } else {
      createAgent.mutate(data, {
        onSuccess: () => { toast({ title: "Agente criado ✅" }); setDialogOpen(false); },
        onError: () => toast({ title: "Erro ao criar", variant: "destructive" }),
      });
    }
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

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b border-border bg-card flex items-center gap-3 px-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/atendimento/config")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Bot className="h-5 w-5 text-primary" />
        <h1 className="font-semibold text-base">Agentes IA</h1>
        <div className="flex-1" />
        <Button size="sm" onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> Novo Agente
        </Button>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : !agents?.length ? (
          <div className="text-center py-16 space-y-3">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">Nenhum agente IA configurado</p>
            <Button onClick={handleCreate}><Plus className="h-4 w-4 mr-1.5" /> Criar primeiro agente</Button>
          </div>
        ) : (
          agents.map(agent => (
            <Card key={agent.id} className={!agent.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-11 w-11 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {agent.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm truncate">{agent.name}</p>
                    {agent.is_default && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        <Star className="h-2.5 w-2.5 mr-0.5 fill-current" /> Padrão
                      </Badge>
                    )}
                    {!agent.is_active && <Badge variant="outline" className="text-[10px]">Inativo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {agent.model} · {agent.tone} · {agent.max_tokens} tokens
                  </p>
                  {agent.departments?.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {agent.departments.slice(0, 3).map(d => (
                        <Badge key={d} variant="outline" className="text-[9px] px-1.5 py-0">{d}</Badge>
                      ))}
                      {agent.departments.length > 3 && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">+{agent.departments.length - 3}</Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!agent.is_default && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleSetDefault(agent)} title="Definir como padrão">
                      <Star className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(agent)} title="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDuplicate(agent)} title="Duplicar">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleToggleActive(agent)} title={agent.is_active ? "Desativar" : "Ativar"}>
                    <Power className={`h-3.5 w-3.5 ${agent.is_active ? "text-emerald-500" : "text-muted-foreground"}`} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(agent)} title="Excluir">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AgentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agent={editingAgent}
        onSave={handleSave}
        isSaving={createAgent.isPending || updateAgent.isPending}
      />
    </div>
  );
}
