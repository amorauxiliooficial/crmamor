import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { MaeDetailDialog } from "@/components/mae/MaeDetailDialog";
import { mockMaes } from "@/data/mockMaes";
import { MaeProcesso, STATUS_ORDER } from "@/types/mae";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMae, setSelectedMae] = useState<MaeProcesso | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredMaes = useMemo(() => {
    if (!searchQuery.trim()) return mockMaes;

    const query = searchQuery.toLowerCase().trim();
    return mockMaes.filter(
      (mae) =>
        mae.nome_mae.toLowerCase().includes(query) ||
        mae.cpf.includes(query.replace(/\D/g, ""))
    );
  }, [searchQuery]);

  const stats = useMemo(() => {
    const total = mockMaes.length;
    const aprovadas = mockMaes.filter(
      (m) => m.status_processo === "✅ Aprovada"
    ).length;
    const indeferidas = mockMaes.filter(
      (m) => m.status_processo === "❌ Indeferida"
    ).length;
    const emAnalise = mockMaes.filter(
      (m) => m.status_processo === "🔎 Em Análise"
    ).length;
    const pendencias = mockMaes.filter(
      (m) => m.status_processo === "⚠️ Pendência Documental"
    ).length;
    const entradaDocs = mockMaes.filter(
      (m) => m.status_processo === "📥 Entrada de Documentos"
    ).length;

    return { total, aprovadas, indeferidas, emAnalise, pendencias, entradaDocs };
  }, []);

  const handleCardClick = (mae: MaeProcesso) => {
    setSelectedMae(mae);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <main className="p-6 space-y-6">
        {/* Stats Grid */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatsCard
            title="Total de Processos"
            value={stats.total}
            icon={Users}
            description="Todas as mães cadastradas"
          />
          <StatsCard
            title="Aprovadas"
            value={stats.aprovadas}
            icon={CheckCircle2}
            className="border-l-4 border-l-emerald-500"
          />
          <StatsCard
            title="Indeferidas"
            value={stats.indeferidas}
            icon={XCircle}
            className="border-l-4 border-l-destructive"
          />
          <StatsCard
            title="Em Análise"
            value={stats.emAnalise}
            icon={Clock}
            className="border-l-4 border-l-primary"
          />
          <StatsCard
            title="Pendências"
            value={stats.pendencias}
            icon={AlertTriangle}
            className="border-l-4 border-l-accent-foreground"
          />
          <StatsCard
            title="Entrada de Docs"
            value={stats.entradaDocs}
            icon={FileText}
            className="border-l-4 border-l-secondary"
          />
        </section>

        {/* Kanban Tabs */}
        <section>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all">Todos os Status</TabsTrigger>
              <TabsTrigger value="active">Em Andamento</TabsTrigger>
              <TabsTrigger value="pending">Pendências</TabsTrigger>
              <TabsTrigger value="completed">Finalizados</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0">
              <div className="rounded-lg border bg-muted/30 min-h-[500px]">
                <KanbanBoard maes={filteredMaes} onCardClick={handleCardClick} />
              </div>
            </TabsContent>

            <TabsContent value="active" className="mt-0">
              <div className="rounded-lg border bg-muted/30 min-h-[500px]">
                <KanbanBoard
                  maes={filteredMaes}
                  onCardClick={handleCardClick}
                  visibleStatuses={[
                    "📥 Entrada de Documentos",
                    "🔎 Em Análise",
                    "🟡 Elegível (Análise Positiva)",
                    "📤 Protocolo INSS",
                    "⏳ Aguardando Análise INSS",
                  ]}
                />
              </div>
            </TabsContent>

            <TabsContent value="pending" className="mt-0">
              <div className="rounded-lg border bg-muted/30 min-h-[500px]">
                <KanbanBoard
                  maes={filteredMaes}
                  onCardClick={handleCardClick}
                  visibleStatuses={["⚠️ Pendência Documental"]}
                />
              </div>
            </TabsContent>

            <TabsContent value="completed" className="mt-0">
              <div className="rounded-lg border bg-muted/30 min-h-[500px]">
                <KanbanBoard
                  maes={filteredMaes}
                  onCardClick={handleCardClick}
                  visibleStatuses={[
                    "✅ Aprovada",
                    "❌ Indeferida",
                    "⚖️ Recurso / Judicial",
                    "📦 Processo Encerrado",
                  ]}
                />
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </main>

      <MaeDetailDialog
        mae={selectedMae}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
};

export default Index;
