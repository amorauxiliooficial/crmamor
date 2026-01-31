import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { KanbanMobileList } from "@/components/kanban/KanbanMobileList";
import { GestantesBoard } from "@/components/kanban/GestantesBoard";
import { MaeTable } from "@/components/mae/MaeTable";
import { MaeCardList } from "@/components/mae/MaeCardList";
import { MaeDetailDialog } from "@/components/mae/MaeDetailDialog";
import { MaeFormDialog } from "@/components/mae/MaeFormDialog";
import { MaeEditDialog } from "@/components/mae/MaeEditDialog";
import { ConferenciaTab } from "@/components/conferencia/ConferenciaTab";
import { PagamentosTab } from "@/components/pagamentos/PagamentosTab";
import { IndicacoesTab } from "@/components/indicacoes/IndicacoesTab";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { GuidedTour } from "@/components/tour/GuidedTour";
import { MobileViewSelector } from "@/components/layout/MobileViewSelector";
import { ViewTransition } from "@/components/layout/ViewTransition";

import { AtividadeDialog } from "@/components/atividades/AtividadeDialog";
import { CrmTab } from "@/components/atividades/CrmTab";
import { Indicacao } from "@/types/indicacao";
import { useAuth } from "@/hooks/useAuth";
import { useTour } from "@/hooks/useTour";
import { useIsMobile } from "@/hooks/use-mobile";
import { useFollowUpSound } from "@/hooks/useFollowUpSound";
import { supabase } from "@/integrations/supabase/client";
import { MaeProcesso, StatusProcesso } from "@/types/mae";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Baby,
  Loader2,
  LayoutGrid,
  List,
  ClipboardCheck,
  DollarSign,
  UserPlus,
  HelpCircle,
  Megaphone,
  BookOpen,
  ClipboardList,
  Brain,
  Activity,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { logError, getUserFriendlyError } from "@/lib/errorHandler";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { differenceInMonths, parseISO } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Extended MaeProcesso with activity data
interface MaeProcessoComAtividade extends MaeProcesso {
  ultima_atividade_em?: string | null;
}

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
  const { run: tourRun, stepIndex, setStepIndex, stopTour, startTour } = useTour();
  const isMobile = useIsMobile();
  const { playSound } = useFollowUpSound();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMae, setSelectedMae] = useState<MaeProcessoComAtividade | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [atividadeDialogOpen, setAtividadeDialogOpen] = useState(false);
  const [maes, setMaes] = useState<MaeProcessoComAtividade[]>([]);
  const [allMaesRaw, setAllMaesRaw] = useState<{ id: string; user_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusProcesso | "all" | "gestantes">("all");
  const [viewMode, setViewMode] = useState<"kanban" | "table" | "gestantes" | "conferencia" | "pagamentos" | "indicacoes" | "atividades">("kanban");
  const [selectedIndicacaoFromNotification, setSelectedIndicacaoFromNotification] = useState<Indicacao | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [showOnboardingOnLoad, setShowOnboardingOnLoad] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [users, setUsers] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);

  const handleNotificationClick = (indicacao: Indicacao) => {
    setViewMode("indicacoes");
    setSelectedIndicacaoFromNotification(indicacao);
  };

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Onboarding modal is now opened manually via header button only
  // Removed automatic popup on first load

  // Fetch processes from database
  const fetchMaes = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("mae_processo")
      .select("*")
      .order("data_ultima_atualizacao", { ascending: false });

    if (error) {
      logError('fetch_maes', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: getUserFriendlyError(error),
      });
    } else if (data) {
      // Store raw data for user extraction
      setAllMaesRaw(data.map((item) => ({ id: item.id, user_id: item.user_id })));
      
      const mappedData: MaeProcessoComAtividade[] = data.map((item) => ({
        id: item.id,
        user_id: item.user_id,
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
        senha_gov: item.senha_gov || undefined,
        verificacao_duas_etapas: item.verificacao_duas_etapas ?? false,
        is_gestante: item.is_gestante ?? false,
        mes_gestacao: item.mes_gestacao ?? null,
        data_ultima_atualizacao: item.data_ultima_atualizacao,
        link_documentos: item.link_documentos || null,
        ultima_atividade_em: (item as { ultima_atividade_em?: string | null }).ultima_atividade_em || null,
      }));
      setMaes(mappedData);
    }
    setLoading(false);
  };

  // Fetch all users (profiles) for user selector
  const fetchUsers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name", { ascending: true, nullsFirst: false });
    
    if (profiles) {
      setUsers(profiles);
    }
  };

  // Helper to get display name for user
  const getUserDisplayName = (u: { id: string; full_name: string | null; email: string | null }) => {
    if (u.full_name) return u.full_name;
    if (u.email) return u.email.split("@")[0];
    return "Sem nome";
  };

  useEffect(() => {
    if (user) {
      fetchMaes();
      fetchUsers();
    }
  }, [user]);

  // Função para remover acentos
  const removeAccents = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const isDppAtiva = (dpp: Date) => {
    const hoje = new Date();
    const diasDesdeDpp = Math.floor(
      (hoje.getTime() - dpp.getTime()) / (1000 * 60 * 60 * 24)
    );
    // Inclui gestantes com DPP no futuro e até 30 dias após a DPP
    return diasDesdeDpp <= 30;
  };

  // Filter by user first
  const maesFilteredByUser = useMemo(() => {
    if (selectedUserId === "all") return maes;
    return maes.filter((mae) => mae.user_id === selectedUserId);
  }, [maes, selectedUserId]);

  const filteredMaes = useMemo(() => {
    let filtered = maesFilteredByUser;
    
    // Apply gestantes filter
    if (statusFilter === "gestantes") {
      filtered = filtered.filter((mae) => {
        if (!mae.is_gestante) return false;
        if (mae.data_evento_tipo !== "DPP" || !mae.data_evento) return false;
        const dpp = parseISO(mae.data_evento);
        return isDppAtiva(dpp);
      });
    }
    // Apply status filter
    else if (statusFilter !== "all") {
      filtered = filtered.filter((mae) => mae.status_processo === statusFilter);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = removeAccents(searchQuery.toLowerCase().trim());
      const queryDigits = query.replace(/\D/g, "");
      
      filtered = filtered.filter((mae) => {
        const normalizedName = removeAccents(mae.nome_mae?.toLowerCase() || "");
        const nameMatch = normalizedName.includes(query);
        const cpfMatch = queryDigits.length > 0 && mae.cpf?.replace(/\D/g, "").includes(queryDigits);
        return nameMatch || cpfMatch;
      });
    }
    
    return filtered;
  }, [searchQuery, maesFilteredByUser, statusFilter]);

  // Filter only gestantes (is_gestante = true, DPP no futuro ou até 30 dias após a DPP)
  const gestantes = useMemo(() => {
    return maesFilteredByUser.filter((m) => {
      if (!m.is_gestante) return false;
      if (m.data_evento_tipo !== "DPP" || !m.data_evento) return false;
      const dpp = parseISO(m.data_evento);
      return isDppAtiva(dpp);
    });
  }, [maesFilteredByUser]);

  const gestantesCount = gestantes.length;

  const stats = useMemo(() => {
    const total = maesFilteredByUser.length;
    const aprovadas = maesFilteredByUser.filter(
      (m) => m.status_processo === "✅ Aprovada"
    ).length;
    const indeferidas = maesFilteredByUser.filter(
      (m) => m.status_processo === "❌ Indeferida"
    ).length;
    const emAnalise = maesFilteredByUser.filter(
      (m) => m.status_processo === "🔎 Em Análise"
    ).length;
    const pendencias = maesFilteredByUser.filter(
      (m) => m.status_processo === "⚠️ Pendência Documental"
    ).length;

    return { total, aprovadas, indeferidas, emAnalise, pendencias };
  }, [maesFilteredByUser]);

  const handleStatsClick = (filter: StatusProcesso | "all" | "gestantes") => {
    setStatusFilter(statusFilter === filter ? "all" : filter);
  };

  const handleCardClick = (mae: MaeProcessoComAtividade) => {
    setSelectedMae(mae);
    setEditDialogOpen(true);
  };

  const handleOpenAtividades = (mae: MaeProcessoComAtividade) => {
    setSelectedMae(mae);
    setAtividadeDialogOpen(true);
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
      logError('update_status', error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: getUserFriendlyError(error),
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
      <GuidedTour
        run={tourRun}
        stepIndex={stepIndex}
        onStepChange={setStepIndex}
        onFinish={stopTour}
      />
      
      <Header 
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery} 
        onAddMae={() => setFormDialogOpen(true)}
        onSelectIndicacao={handleNotificationClick}
        onOpenOnboarding={() => setOnboardingOpen(true)}
        onViewChange={(view) => setViewMode(view as typeof viewMode)}
        currentView={viewMode}
      />

      <main className="p-3 md:p-6 space-y-3 md:space-y-6 overflow-x-hidden">

        {/* User Selector */}
        <section className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Usuário:</span>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos os usuários" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os usuários</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {getUserDisplayName(u)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedUserId !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {getUserDisplayName(users.find((u) => u.id === selectedUserId) || { id: "", full_name: null, email: null })}
            </Badge>
          )}
        </section>

        {/* Stats Grid - Horizontal scroll on mobile */}
        <section className="tour-stats">
          <ScrollArea className="w-full md:w-auto">
            <div className="flex gap-3 pb-2 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 md:gap-4">
              <StatsCard
                title="Total"
                value={stats.total}
                icon={Users}
                description="Processos"
                onClick={() => handleStatsClick("all")}
                isActive={statusFilter === "all"}
                className="min-w-[140px] md:min-w-0"
              />
              <StatsCard
                title="Aprovadas"
                value={stats.aprovadas}
                icon={CheckCircle2}
                className="border-l-4 border-l-emerald-500 min-w-[140px] md:min-w-0"
                onClick={() => handleStatsClick("✅ Aprovada")}
                isActive={statusFilter === "✅ Aprovada"}
              />
              <StatsCard
                title="Indeferidas"
                value={stats.indeferidas}
                icon={XCircle}
                className="border-l-4 border-l-destructive min-w-[140px] md:min-w-0"
                onClick={() => handleStatsClick("❌ Indeferida")}
                isActive={statusFilter === "❌ Indeferida"}
              />
              <StatsCard
                title="Em Análise"
                value={stats.emAnalise}
                icon={Clock}
                className="border-l-4 border-l-primary min-w-[140px] md:min-w-0"
                onClick={() => handleStatsClick("🔎 Em Análise")}
                isActive={statusFilter === "🔎 Em Análise"}
              />
              <StatsCard
                title="Pendências"
                value={stats.pendencias}
                icon={AlertTriangle}
                className="border-l-4 border-l-accent-foreground min-w-[140px] md:min-w-0"
                onClick={() => handleStatsClick("⚠️ Pendência Documental")}
                isActive={statusFilter === "⚠️ Pendência Documental"}
              />
              <StatsCard
                title="Gestantes"
                value={gestantesCount}
                icon={Baby}
                className="border-l-4 border-l-pink-500 min-w-[140px] md:min-w-0"
                onClick={() => handleStatsClick("gestantes")}
                isActive={statusFilter === "gestantes"}
              />
            </div>
            <ScrollBar orientation="horizontal" className="md:hidden" />
          </ScrollArea>
        </section>


        {/* View Toggle and Content */}
        <section>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 md:gap-3">
              <h2 className="text-base md:text-lg font-semibold">Processos</h2>
              {searchQuery.trim() && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  "{searchQuery}" ({filteredMaes.length})
                </Badge>
              )}
            </div>
            
            {/* Mobile View Selector */}
            <div className="md:hidden">
              <MobileViewSelector
                value={viewMode}
                onValueChange={(value) => setViewMode(value as typeof viewMode)}
              />
            </div>
            
            {/* Desktop Navigation Menu */}
            <nav className="hidden md:flex items-center gap-1 tour-view-toggle flex-wrap">
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value) => value && setViewMode(value as "kanban" | "table" | "gestantes" | "conferencia" | "pagamentos" | "indicacoes" | "atividades")}
                className="bg-muted/50 rounded-lg p-1 gap-0.5"
              >
                <ToggleGroupItem 
                  value="kanban" 
                  aria-label="Kanban" 
                  className="tour-view-kanban data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md px-2 py-1.5 text-sm"
                >
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="table" 
                  aria-label="Tabela" 
                  className="tour-view-table data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md px-2 py-1.5 text-sm"
                >
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="atividades" 
                  aria-label="Atividades CRM" 
                  className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md px-2 py-1.5 text-sm"
                >
                  <Activity className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="gestantes" 
                  aria-label="Gestantes" 
                  className="tour-view-gestantes data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md px-2 py-1.5 text-sm"
                >
                  <Baby className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="conferencia" 
                  aria-label="Conferência" 
                  className="tour-view-conferencia data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md px-2 py-1.5 text-sm"
                >
                  <ClipboardCheck className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="pagamentos" 
                  aria-label="Pagamentos" 
                  className="tour-view-pagamentos data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md px-2 py-1.5 text-sm"
                >
                  <DollarSign className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="indicacoes" 
                  aria-label="Indicações" 
                  className="tour-view-indicacoes data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md px-2 py-1.5 text-sm"
                >
                  <UserPlus className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>

              <Separator orientation="vertical" className="h-6 mx-1" />

              <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 tour-playbook"
                  onClick={() => navigate("/playbook")}
                  title="Playbook"
                >
                  <BookOpen className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 tour-onboarding"
                  onClick={() => setOnboardingOpen(true)}
                  title="Onboarding"
                >
                  <ClipboardList className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => navigate("/marketing")}
                  title="Marketing"
                >
                  <Megaphone className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => navigate("/pre-analises")}
                  title="Pré-Análises"
                >
                  <Brain className="h-4 w-4" />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={startTour}
                className="h-8 w-8"
                title="Iniciar tour guiado"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </nav>
          </div>

          <ViewTransition viewKey={viewMode}>
            {viewMode === "indicacoes" ? (
              <div className="rounded-lg border bg-muted/30 min-h-[500px] p-4">
                <IndicacoesTab 
                  searchQuery={searchQuery} 
                  externalSelectedIndicacao={selectedIndicacaoFromNotification}
                  onClearExternalSelection={() => setSelectedIndicacaoFromNotification(null)}
                  selectedUserId={selectedUserId}
                />
              </div>
            ) : viewMode === "conferencia" ? (
              <div className="rounded-lg border bg-muted/30 min-h-[500px] p-4">
                <ConferenciaTab searchQuery={searchQuery} selectedUserId={selectedUserId} />
              </div>
            ) : viewMode === "pagamentos" ? (
              <div className="rounded-lg border bg-muted/30 min-h-[500px] p-4">
                <PagamentosTab searchQuery={searchQuery} selectedUserId={selectedUserId} />
              </div>
            ) : viewMode === "gestantes" ? (
              <div className="rounded-lg border bg-muted/30 min-h-[500px]">
                <GestantesBoard
                  maes={statusFilter === "gestantes" ? filteredMaes : gestantes}
                  onCardClick={handleCardClick}
                  onRefresh={fetchMaes}
                />
              </div>
            ) : viewMode === "atividades" ? (
              <div className="rounded-lg border bg-muted/30 min-h-[500px] p-4">
                <CrmTab
                  maes={maesFilteredByUser}
                  onRefresh={fetchMaes}
                  selectedUserId={selectedUserId !== "all" ? selectedUserId : null}
                />
              </div>
            ) : viewMode === "table" ? (
              isMobile ? (
                <MaeCardList maes={filteredMaes} onCardClick={handleCardClick} />
              ) : (
                <MaeTable maes={filteredMaes} onRowClick={handleCardClick} />
              )
            ) : (
            <Tabs defaultValue="all" className="w-full">
              <ScrollArea className="w-full">
                <TabsList className="mb-4 w-max md:w-auto">
                  <TabsTrigger value="all">Todos</TabsTrigger>
                  <TabsTrigger value="active">Andamento</TabsTrigger>
                  <TabsTrigger value="pending">Pendências</TabsTrigger>
                  <TabsTrigger value="completed">Finalizados</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" className="md:hidden" />
              </ScrollArea>

              <TabsContent value="all" className="mt-0">
                <div className="rounded-lg border bg-muted/30 min-h-[400px] md:min-h-[500px] tour-kanban">
                  {isMobile ? (
                    <KanbanMobileList maes={filteredMaes} onCardClick={handleCardClick} />
                  ) : (
                    <KanbanBoard 
                      maes={filteredMaes} 
                      onCardClick={handleCardClick} 
                      onStatusChange={handleStatusChange}
                      onOpenAtividades={handleOpenAtividades}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="active" className="mt-0">
                <div className="rounded-lg border bg-muted/30 min-h-[500px]">
                  <KanbanBoard
                    maes={filteredMaes}
                    onCardClick={handleCardClick}
                    onStatusChange={handleStatusChange}
                    onOpenAtividades={handleOpenAtividades}
                    visibleStatuses={[
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
                    onOpenAtividades={handleOpenAtividades}
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
                    onOpenAtividades={handleOpenAtividades}
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
            )}
          </ViewTransition>
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
        onSuccess={(createdMae) => {
          fetchMaes();
          if (createdMae) {
            // Map the status to display format
            const mappedMae = {
              ...createdMae,
              status_processo: mapDbStatusToDisplay(createdMae.status_processo) as MaeProcesso["status_processo"],
            };
            setSelectedMae(mappedMae);
            setEditDialogOpen(true);
          }
        }}
      />

      {selectedMae && (
        <AtividadeDialog
          mae={selectedMae}
          open={atividadeDialogOpen}
          onOpenChange={setAtividadeDialogOpen}
          onActivityAdded={fetchMaes}
        />
      )}

      <OnboardingModal
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
      />
    </div>
  );
};

export default Index;
