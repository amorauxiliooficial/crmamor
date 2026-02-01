import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { RoadmapBoard } from "@/components/roadmap/RoadmapBoard";
import { TarefaFormDialog } from "@/components/roadmap/TarefaFormDialog";
import { QuickTaskInput } from "@/components/roadmap/QuickTaskInput";
import { useTarefasInternas } from "@/hooks/useTarefasInternas";
import { useTarefaResponsaveis } from "@/hooks/useTarefaResponsaveis";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Loader2, ShieldAlert, ArrowLeft, Users, X, Filter, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TaskPriority, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS } from "@/types/tarefaInterna";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Roadmap() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { tarefas, loading, createTarefa, updateTarefa, updateStatus, deleteTarefa } = useTarefasInternas();
  const { responsaveis } = useTarefaResponsaveis();
  const [formOpen, setFormOpen] = useState(false);
  const [usuarios, setUsuarios] = useState<{ id: string; nome: string }[]>([]);
  const [filtroResponsaveis, setFiltroResponsaveis] = useState<string[]>([]);
  const [filtroPrioridades, setFiltroPrioridades] = useState<TaskPriority[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !adminLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, authLoading, adminLoading, navigate]);

  useEffect(() => {
    const fetchUsuarios = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email");

      if (data) {
        setUsuarios(
          data.map((u) => ({
            id: u.id,
            nome: u.full_name || u.email?.split("@")[0] || "Sem nome",
          }))
        );
      }
    };
    fetchUsuarios();
  }, []);

  const toggleResponsavel = (userId: string) => {
    setFiltroResponsaveis((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const togglePrioridade = (prioridade: TaskPriority) => {
    setFiltroPrioridades((prev) =>
      prev.includes(prioridade)
        ? prev.filter((p) => p !== prioridade)
        : [...prev, prioridade]
    );
  };

  // Filter tarefas by responsavel and priority
  const tarefasFiltradas = useMemo(() => {
    let filtered = tarefas;

    // Filter by responsaveis
    if (filtroResponsaveis.length > 0) {
      if (filtroResponsaveis.includes("sem_responsavel")) {
        filtered = filtered.filter((t) => {
          const resp = responsaveis[t.id] || [];
          return resp.length === 0 || filtroResponsaveis.some((id) => id !== "sem_responsavel" && resp.includes(id));
        });
      } else {
        filtered = filtered.filter((t) => {
          const resp = responsaveis[t.id] || [];
          return filtroResponsaveis.some((id) => resp.includes(id));
        });
      }
    }

    // Filter by priorities
    if (filtroPrioridades.length > 0) {
      filtered = filtered.filter((t) => filtroPrioridades.includes(t.prioridade));
    }

    return filtered;
  }, [tarefas, filtroResponsaveis, filtroPrioridades, responsaveis]);

  const hasActiveFilters = filtroResponsaveis.length > 0 || filtroPrioridades.length > 0;
  const clearAllFilters = () => {
    setFiltroResponsaveis([]);
    setFiltroPrioridades([]);
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Acesso Restrito</h1>
        <p className="text-muted-foreground">Esta página é exclusiva para administradores.</p>
        <Button onClick={() => navigate("/")}>Voltar ao Início</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        searchQuery=""
        onSearchChange={() => {}}
      />

      <main className="p-3 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="shrink-0 h-8 w-8 md:h-10 md:w-10"
            >
              <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <div>
              <h1 className="text-lg md:text-2xl font-bold">🗺️ Roadmap</h1>
              <p className="text-muted-foreground text-xs md:text-sm hidden sm:block">
                Gerencie as tarefas internas
              </p>
            </div>
          </div>
          <Button onClick={() => setFormOpen(true)} variant="outline" size="sm" className="h-8 md:h-9 self-end sm:self-auto">
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Formulário Completo</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Responsável Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 md:h-9 gap-1.5 text-xs md:text-sm",
                  filtroResponsaveis.length > 0 && "border-primary bg-primary/5"
                )}
              >
                <Users className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Responsável</span>
                {filtroResponsaveis.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {filtroResponsaveis.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <ScrollArea className="max-h-64">
                <div className="space-y-1">
                  <button
                    onClick={() => toggleResponsavel("sem_responsavel")}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors",
                      filtroResponsaveis.includes("sem_responsavel") && "bg-accent"
                    )}
                  >
                    <div className={cn(
                      "h-4 w-4 rounded border flex items-center justify-center",
                      filtroResponsaveis.includes("sem_responsavel") 
                        ? "bg-primary border-primary text-primary-foreground" 
                        : "border-input"
                    )}>
                      {filtroResponsaveis.includes("sem_responsavel") && <Check className="h-3 w-3" />}
                    </div>
                    <span className="text-muted-foreground italic">Sem responsável</span>
                  </button>
                  {usuarios.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => toggleResponsavel(u.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors",
                        filtroResponsaveis.includes(u.id) && "bg-accent"
                      )}
                    >
                      <div className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center",
                        filtroResponsaveis.includes(u.id) 
                          ? "bg-primary border-primary text-primary-foreground" 
                          : "border-input"
                      )}>
                        {filtroResponsaveis.includes(u.id) && <Check className="h-3 w-3" />}
                      </div>
                      <span className="truncate">{u.nome}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>

          {/* Prioridade Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 md:h-9 gap-1.5 text-xs md:text-sm",
                  filtroPrioridades.length > 0 && "border-primary bg-primary/5"
                )}
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Prioridade</span>
                {filtroPrioridades.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {filtroPrioridades.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1">
                {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map((prioridade) => (
                  <button
                    key={prioridade}
                    onClick={() => togglePrioridade(prioridade)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors",
                      filtroPrioridades.includes(prioridade) && "bg-accent"
                    )}
                  >
                    <div className={cn(
                      "h-4 w-4 rounded border flex items-center justify-center",
                      filtroPrioridades.includes(prioridade) 
                        ? "bg-primary border-primary text-primary-foreground" 
                        : "border-input"
                    )}>
                      {filtroPrioridades.includes(prioridade) && <Check className="h-3 w-3" />}
                    </div>
                    <Badge className={cn("text-xs", TASK_PRIORITY_COLORS[prioridade])}>
                      {TASK_PRIORITY_LABELS[prioridade]}
                    </Badge>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Clear filters & count */}
          {hasActiveFilters && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 md:h-9 gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={clearAllFilters}
              >
                <X className="h-3.5 w-3.5" />
                Limpar
              </Button>
              <Badge variant="outline" className="text-[10px] md:text-xs">
                {tarefasFiltradas.length} tarefa(s)
              </Badge>
            </>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <RoadmapBoard
            tarefas={tarefasFiltradas}
            onStatusChange={updateStatus}
            onUpdate={updateTarefa}
            onDelete={deleteTarefa}
            onCreateTarefa={createTarefa}
          />
        )}
      </main>

      <TarefaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={createTarefa}
        usuarios={usuarios}
      />
    </div>
  );
}
