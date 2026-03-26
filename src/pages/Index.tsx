import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useMaesData, MaeProcessoComAtividade } from "@/hooks/useMaesData";
import { MaeProcesso, StatusProcesso, STATUS_ORDER } from "@/types/mae";
import { Loader2, LayoutGrid, List, Baby, ClipboardCheck, DollarSign, UserPlus, MessageSquare, Target } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { toast } from "sonner";

// Layout
import { Header } from "@/components/layout/Header";
import { MobileViewSelector } from "@/components/layout/MobileViewSelector";
import { ViewTransition } from "@/components/layout/ViewTransition";

// Dashboard
import { OperationsPanel } from "@/components/dashboard/OperationsPanel";

// Kanban / Table
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { KanbanMobileList } from "@/components/kanban/KanbanMobileList";
import { GestantesBoard } from "@/components/kanban/GestantesBoard";
import { MaeTable } from "@/components/mae/MaeTable";

// Mae dialogs
import { MaeFormDialog } from "@/components/mae/MaeFormDialog";
import { MaeDetailDialog } from "@/components/mae/MaeDetailDialog";
import { MaeEditDialog } from "@/components/mae/MaeEditDialog";

// Tabs
import { AtividadesTab } from "@/components/atividades/AtividadesTab";
import { CrmTab } from "@/components/atividades/CrmTab";
import { ConferenciaTab } from "@/components/conferencia/ConferenciaTab";
import { PagamentosTab } from "@/components/pagamentos/PagamentosTab";
import { IndicacoesTab } from "@/components/indicacoes/IndicacoesTab";
import { ChatPanel } from "@/components/atendimento/ChatPanel";

// Onboarding / Tour
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { GuidedTour } from "@/components/tour/GuidedTour";

// Types
import { Indicacao } from "@/types/indicacao";

const VIEW_ORDER = ["kanban", "table", "atividades", "gestantes", "conferencia", "pagamentos", "indicacoes", "chat"];

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isAdmin } = useIsAdmin();

  const { maes, alertasNaoLidos, loading: dataLoading, refetch, refreshSingleMae } = useMaesData();

  // View state
  const [currentView, setCurrentView] = useState("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailMae, setDetailMae] = useState<MaeProcesso | null>(null);
  const [editMae, setEditMae] = useState<MaeProcesso | null>(null);
  const [selectedIndicacao, setSelectedIndicacao] = useState<Indicacao | null>(null);

  // Onboarding / Tour
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [tourRunning, setTourRunning] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);


  // Swipe navigation for mobile
  const swipeHandlers = useSwipeNavigation({
    onSwipeLeft: () => {
      const idx = VIEW_ORDER.indexOf(currentView);
      if (idx < VIEW_ORDER.length - 1) setCurrentView(VIEW_ORDER[idx + 1]);
    },
    onSwipeRight: () => {
      const idx = VIEW_ORDER.indexOf(currentView);
      if (idx > 0) setCurrentView(VIEW_ORDER[idx - 1]);
    },
  });

  // Filter maes
  const filteredMaes = useMemo(() => {
    let result = maes;

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.nome_mae.toLowerCase().includes(q) ||
          m.cpf.includes(q) ||
          m.telefone?.includes(q) ||
          m.email?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [maes, searchQuery]);


  const handleCardClick = useCallback((mae: MaeProcesso) => {
    setDetailMae(mae);
  }, []);

  const handleStatusChange = useCallback(
    async (maeId: string, newStatus: StatusProcesso) => {
      // Map display status to db status (remove emoji prefix)
      const parts = newStatus.split(" ");
      const dbStatus = parts.length > 1 ? parts.slice(1).join(" ") : newStatus;
      const updatePayload = {
        status_processo: dbStatus,
        data_ultima_atualizacao: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("mae_processo")
        .update(updatePayload as Record<string, unknown>)
        .eq("id", maeId);

      if (error) {
        toast.error("Erro ao atualizar status");
        return;
      }

      refreshSingleMae(maeId);
    },
    [refreshSingleMae],
  );

  const handleViewChange = useCallback((view: string) => {
    setCurrentView(view);
  }, []);

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" {...swipeHandlers}>
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddMae={() => setAddDialogOpen(true)}
        onSelectIndicacao={(indicacao) => {
          setSelectedIndicacao(indicacao);
          setCurrentView("indicacoes");
        }}
        onOpenOnboarding={() => setOnboardingOpen(true)}
        onViewChange={handleViewChange}
        currentView={currentView}
      />

      <main className="p-3 md:p-6 space-y-4">
        {/* Mobile view selector */}
        {isMobile && <MobileViewSelector value={currentView} onValueChange={setCurrentView} />}

        {/* Desktop navigation tabs */}
        {!isMobile && (
          <Tabs value={currentView} onValueChange={setCurrentView} className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto gap-1 bg-muted/50 p-1">
              <TabsTrigger value="kanban" className="gap-1.5 text-xs">
                <LayoutGrid className="h-3.5 w-3.5" />
                Processos
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-1.5 text-xs">
                <List className="h-3.5 w-3.5" />
                Tabela
              </TabsTrigger>
              <TabsTrigger value="gestantes" className="gap-1.5 text-xs">
                <Baby className="h-3.5 w-3.5" />
                Gestantes
              </TabsTrigger>
              <TabsTrigger value="conferencia" className="gap-1.5 text-xs">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Conferência
              </TabsTrigger>
              <TabsTrigger value="pagamentos" className="gap-1.5 text-xs">
                <DollarSign className="h-3.5 w-3.5" />
                Pagamentos
              </TabsTrigger>
              <TabsTrigger value="indicacoes" className="gap-1.5 text-xs">
                <UserPlus className="h-3.5 w-3.5" />
                Indicações
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-1.5 text-xs">
                <MessageSquare className="h-3.5 w-3.5" />
                Chat
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Operations Panel - simplified */}
        {(currentView === "kanban" || currentView === "table") && (
          <OperationsPanel
            totalMaes={maes.length}
            filteredCount={filteredMaes.length}
          />
        )}

        {/* Content area with view transition */}
        <ViewTransition viewKey={currentView}>
          {dataLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {currentView === "kanban" &&
                (isMobile ? (
                  <KanbanMobileList maes={filteredMaes} onCardClick={handleCardClick} />
                ) : (
                  <KanbanBoard
                    maes={filteredMaes}
                    onCardClick={handleCardClick}
                    onStatusChange={handleStatusChange}
                    alertasNaoLidos={alertasNaoLidos}
                  />
                ))}

              {currentView === "table" && <MaeTable maes={filteredMaes} onRowClick={handleCardClick} />}

              {currentView === "atividades" && (
                <AtividadesTab
                  maes={filteredMaes as MaeProcessoComAtividade[]}
                  onRefresh={refetch}
                  selectedUserId={undefined}
                />
              )}

              {currentView === "crm" && <CrmTab maes={filteredMaes} onRefresh={refetch} />}

              {currentView === "gestantes" && (
                <GestantesBoard
                  maes={filteredMaes.filter((m) => m.is_gestante)}
                  onCardClick={handleCardClick}
                  onRefresh={refetch}
                />
              )}

              {currentView === "conferencia" && (
                <ConferenciaTab searchQuery={searchQuery} selectedUserId={undefined} />
              )}

              {currentView === "pagamentos" && (
                <PagamentosTab searchQuery={searchQuery} selectedUserId={undefined} />
              )}

              {currentView === "indicacoes" && (
                <IndicacoesTab
                  searchQuery={searchQuery}
                  externalSelectedIndicacao={selectedIndicacao}
                  onClearExternalSelection={() => setSelectedIndicacao(null)}
                  selectedUserId={undefined}
                />
              )}

              {currentView === "chat" && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <p className="text-muted-foreground">Acesse o módulo completo de atendimento</p>
                  <button
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    onClick={() => navigate("/atendimento")}
                  >
                    Abrir Atendimento
                  </button>
                </div>
              )}
            </>
          )}
        </ViewTransition>
      </main>

      {/* Dialogs */}
      <MaeFormDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => {
          setAddDialogOpen(false);
          refetch();
        }}
      />

      <MaeDetailDialog
        mae={detailMae}
        open={!!detailMae}
        onOpenChange={(open) => {
          if (!open) setDetailMae(null);
        }}
        onEdit={(mae) => {
          setDetailMae(null);
          setEditMae(mae);
        }}
      />

      <MaeEditDialog
        mae={editMae}
        open={!!editMae}
        onOpenChange={(open) => {
          if (!open) setEditMae(null);
        }}
        onSuccess={() => {
          setEditMae(null);
          refetch();
        }}
      />

      <OnboardingModal open={onboardingOpen} onOpenChange={setOnboardingOpen} />

      <GuidedTour
        run={tourRunning}
        stepIndex={tourStepIndex}
        onStepChange={setTourStepIndex}
        onFinish={() => setTourRunning(false)}
      />
    </div>
  );
}
