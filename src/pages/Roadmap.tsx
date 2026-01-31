import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { RoadmapBoard } from "@/components/roadmap/RoadmapBoard";
import { TarefaFormDialog } from "@/components/roadmap/TarefaFormDialog";
import { QuickTaskInput } from "@/components/roadmap/QuickTaskInput";
import { useTarefasInternas } from "@/hooks/useTarefasInternas";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, ShieldAlert, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function Roadmap() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const { tarefas, loading, createTarefa, updateTarefa, updateStatus, deleteTarefa } = useTarefasInternas();
  const [formOpen, setFormOpen] = useState(false);
  const [usuarios, setUsuarios] = useState<{ id: string; nome: string }[]>([]);

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
            Formulário Completo
          </Button>
        </div>

        {/* Quick task input */}
        <QuickTaskInput onCreateTask={createTarefa} />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <RoadmapBoard
            tarefas={tarefas}
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
