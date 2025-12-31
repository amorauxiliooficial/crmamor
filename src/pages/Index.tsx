import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { MaeDetailDialog } from "@/components/mae/MaeDetailDialog";
import { MaeFormDialog } from "@/components/mae/MaeFormDialog";
import { MaeEditDialog } from "@/components/mae/MaeEditDialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MaeProcesso, StatusProcesso } from "@/types/mae";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Loader2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

// Map database status to display status with emoji
const mapDbStatusToDisplay = (status: string): StatusProcesso => {
  const statusMap: Record<string, StatusProcesso> = {
    "Entrada de Documentos": "📥 Entrada de Documentos",
    "Em Análise": "🔎 Em Análise",
    "Pendência Documental": "⚠️ Pendência Documental",
    "Elegível (Análise Positiva)": "🟡 Elegível (Análise Positiva)",
    "Protocolo INSS": "📤 Protocolo INSS",
    "Aguardando Análise INSS": "⏳ Aguardando Análise INSS",
    "Aprovada": "✅ Aprovada",
    "Indeferida": "❌ Indeferida",
    "Recurso / Judicial": "⚖️ Recurso / Judicial",
    "Processo Encerrado": "📦 Processo Encerrado",
  };
  return statusMap[status] || ("📥 Entrada de Documentos" as StatusProcesso);
};

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMae, setSelectedMae] = useState<MaeProcesso | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [maes, setMaes] = useState<MaeProcesso[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Fetch processes from database
  const fetchMaes = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("mae_processo")
      .select("*")
      .order("data_ultima_atualizacao", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: error.message,
      });
    } else if (data) {
      const mappedData: MaeProcesso[] = data.map((item) => ({
        id: item.id,
        nome_mae: item.nome_mae,
        cpf: item.cpf,
        telefone: item.telefone || undefined,
        email: item.email || undefined,
        tipo_evento: item.tipo_evento as MaeProcesso["tipo_evento"],
        data_evento: item.data_evento || undefined,
        data_evento_tipo: (item.data_evento_tipo || "") as MaeProcesso["data_evento_tipo"],
        categoria_previdenciaria: item.categoria_previdenciaria as MaeProcesso["categoria_previdenciaria"],
        status_processo: mapDbStatusToDisplay(item.status_processo),
        protocolo_inss: item.protocolo_inss || undefined,
        parcelas: item.parcelas || undefined,
        contrato_assinado: item.contrato_assinado,
        segurada: item.segurada || undefined,
        precisa_gps: item.precisa_gps || undefined,
        uf: item.uf || undefined,
        observacoes: item.observacoes || undefined,
        origem: item.origem || undefined,
        data_ultima_atualizacao: item.data_ultima_atualizacao,
      }));
      setMaes(mappedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchMaes();
    }
  }, [user]);

  const filteredMaes = useMemo(() => {
    if (!searchQuery.trim()) return maes;

    const query = searchQuery.toLowerCase().trim();
    return maes.filter(
      (mae) =>
        mae.nome_mae.toLowerCase().includes(query) ||
        mae.cpf.includes(query.replace(/\D/g, ""))
    );
  }, [searchQuery, maes]);

  const stats = useMemo(() => {
    const total = maes.length;
    const aprovadas = maes.filter(
      (m) => m.status_processo === "✅ Aprovada"
    ).length;
    const indeferidas = maes.filter(
      (m) => m.status_processo === "❌ Indeferida"
    ).length;
    const emAnalise = maes.filter(
      (m) => m.status_processo === "🔎 Em Análise"
    ).length;
    const pendencias = maes.filter(
      (m) => m.status_processo === "⚠️ Pendência Documental"
    ).length;
    const entradaDocs = maes.filter(
      (m) => m.status_processo === "📥 Entrada de Documentos"
    ).length;

    return { total, aprovadas, indeferidas, emAnalise, pendencias, entradaDocs };
  }, [maes]);

  const handleCardClick = (mae: MaeProcesso) => {
    setSelectedMae(mae);
    setEditDialogOpen(true);
  };

  // Map display status (with emoji) to db status (without emoji)
  const mapDisplayStatusToDb = (status: StatusProcesso): string => {
    return status.split(" ").slice(1).join(" ") || status;
  };

  const handleStatusChange = async (maeId: string, newStatus: StatusProcesso) => {
    const dbStatus = mapDisplayStatusToDb(newStatus) as 
      "Entrada de Documentos" | "Em Análise" | "Pendência Documental" | 
      "Elegível (Análise Positiva)" | "Protocolo INSS" | "Aguardando Análise INSS" | 
      "Aprovada" | "Indeferida" | "Recurso / Judicial" | "Processo Encerrado";

    const { error } = await supabase
      .from("mae_processo")
      .update({ status_processo: dbStatus })
      .eq("id", maeId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: error.message,
      });
    } else {
      toast({
        title: "Status atualizado",
        description: `Processo movido para ${newStatus}`,
      });
      fetchMaes();
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery} 
        onAddMae={() => setFormDialogOpen(true)}
      />

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
                <KanbanBoard 
                  maes={filteredMaes} 
                  onCardClick={handleCardClick} 
                  onStatusChange={handleStatusChange}
                />
              </div>
            </TabsContent>

            <TabsContent value="active" className="mt-0">
              <div className="rounded-lg border bg-muted/30 min-h-[500px]">
                <KanbanBoard
                  maes={filteredMaes}
                  onCardClick={handleCardClick}
                  onStatusChange={handleStatusChange}
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
                  onStatusChange={handleStatusChange}
                  visibleStatuses={["⚠️ Pendência Documental"]}
                />
              </div>
            </TabsContent>

            <TabsContent value="completed" className="mt-0">
              <div className="rounded-lg border bg-muted/30 min-h-[500px]">
                <KanbanBoard
                  maes={filteredMaes}
                  onCardClick={handleCardClick}
                  onStatusChange={handleStatusChange}
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

      <MaeEditDialog
        mae={selectedMae}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={fetchMaes}
      />

      <MaeFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onSuccess={fetchMaes}
      />
    </div>
  );
};

export default Index;
