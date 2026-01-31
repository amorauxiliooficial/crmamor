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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, ShieldAlert, ArrowLeft, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function Roadmap() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { tarefas, loading, createTarefa, updateTarefa, updateStatus, deleteTarefa } = useTarefasInternas();
  const { responsaveis } = useTarefaResponsaveis();
  const [formOpen, setFormOpen] = useState(false);
  const [usuarios, setUsuarios] = useState<{ id: string; nome: string }[]>([]);
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>("todos");

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

  // Filter tarefas by responsavel
  const tarefasFiltradas = useMemo(() => {
    if (filtroResponsavel === "todos") return tarefas;
    if (filtroResponsavel === "sem_responsavel") {
      return tarefas.filter((t) => {
        const resp = responsaveis[t.id] || [];
        return resp.length === 0;
      });
    }
    return tarefas.filter((t) => {
      const resp = responsaveis[t.id] || [];
      return resp.includes(filtroResponsavel);
    });
  }, [tarefas, filtroResponsavel, responsaveis]);

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">🗺️ Roadmap</h1>
              <p className="text-muted-foreground text-sm">
                Gerencie as tarefas internas e melhorias do sistema
              </p>
            </div>
          </div>
          <Button onClick={() => setFormOpen(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Formulário Completo</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Select value={filtroResponsavel} onValueChange={setFiltroResponsavel}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Filtrar por responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="sem_responsavel">Sem responsável</SelectItem>
                {usuarios.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filtroResponsavel !== "todos" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setFiltroResponsavel("todos")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {filtroResponsavel !== "todos" && (
            <Badge variant="secondary" className="text-xs">
              {tarefasFiltradas.length} tarefa(s) encontrada(s)
            </Badge>
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
