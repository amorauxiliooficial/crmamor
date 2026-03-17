import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useMaesData, MaeProcessoComAtividade } from "@/hooks/useMaesData";
import { MaeProcesso, StatusProcesso, STATUS_ORDER } from "@/types/mae";
import { Loader2 } from "lucide-react";
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

// Onboarding / Tour
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { GuidedTour } from "@/components/tour/GuidedTour";

// Types
import { Indicacao } from "@/types/indicacao";

const VIEW_ORDER = ["kanban", "table", "atividades", "gestantes", "conferencia", "pagamentos", "indicacoes"];

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isAdmin } = useIsAdmin();

  const {
    maes,
    users,
    alertasNaoLidos,
    loading: dataLoading,
    refetch,
    refreshSingleMae,
  } = useMaesData();

  // View state
  const [currentView, setCurrentView] = useState("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusProcesso | "all" | "gestantes">("all");

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

  // Set default user filter to current user
  useEffect(() => {
    if (user && selectedUserId === null) {
      setSelectedUserId(user.id);
    }
  }, [user, selectedUserId]);

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

    // Filter by user
    if (selectedUserId && selectedUserId !== "all") {
      result = result.filter((m) => m.user_id === selectedUserId);
    }

    // Filter by status
    if (statusFilter === "gestantes") {
      result = result.filter((m) => m.is_gestante);
    } else if (statusFilter !== "all") {
      result = result.filter((m) => m.status_processo === statusFilter);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.nome_mae.toLowerCase().includes(q) ||
          m.cpf.includes(q) ||
          m.telefone?.includes(q) ||
          m.email?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [maes, selectedUserId, statusFilter, searchQuery]);

  const getUserDisplayName = useCallback(
    (u: { id: string; full_name: string | null; email: string | null }) => {
      return u.full_name || u.email || u.id.slice(0, 8);
    },
    []
  );

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
    [refreshSingleMae]
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
        {isMobile && (
          <MobileViewSelector value={currentView} onValueChange={setCurrentView} />
        )}

        {/* Operations Panel */}
        {(currentView === "kanban" || currentView === "table") && (
          <OperationsPanel
            totalMaes={maes.length}
            filteredCount={filteredMaes.length}
            selectedUserId={selectedUserId}
            onUserChange={(userId) => setSelectedUserId(userId)}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            users={users}
            getUserDisplayName={getUserDisplayName}
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
              {currentView === "kanban" && (
                isMobile ? (
                  <KanbanMobileList
                    maes={filteredMaes}
                    onCardClick={handleCardClick}
                  />
                ) : (
                  <KanbanBoard
                    maes={filteredMaes}
                    onCardClick={handleCardClick}
                    onStatusChange={handleStatusChange}
                    alertasNaoLidos={alertasNaoLidos}
                  />
                )
              )}

              {currentView === "table" && (
                <MaeTable
                  maes={filteredMaes}
                  onRowClick={handleCardClick}
                />
              )}

              {currentView === "atividades" && (
                <AtividadesTab
                  maes={filteredMaes as MaeProcessoComAtividade[]}
                  onRefresh={refetch}
                  selectedUserId={selectedUserId}
                />
              )}

              {currentView === "crm" && (
                <CrmTab
                  maes={filteredMaes}
                  onRefresh={refetch}
                />
              )}

              {currentView === "gestantes" && (
                <GestantesBoard
                  maes={filteredMaes.filter((m) => m.is_gestante)}
                  onCardClick={handleCardClick}
                  onRefresh={refetch}
                />
              )}

              {currentView === "conferencia" && (
                <ConferenciaTab
                  searchQuery={searchQuery}
                  selectedUserId={selectedUserId ?? undefined}
                />
              )}

              {currentView === "pagamentos" && (
                <PagamentosTab
                  searchQuery={searchQuery}
                  selectedUserId={selectedUserId ?? undefined}
                />
              )}

              {currentView === "indicacoes" && (
                <IndicacoesTab
                  searchQuery={searchQuery}
                  externalSelectedIndicacao={selectedIndicacao}
                  onClearExternalSelection={() => setSelectedIndicacao(null)}
                  selectedUserId={selectedUserId ?? undefined}
                />
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

      <MetasConfigDialog
        open={metasConfigOpen}
        onOpenChange={setMetasConfigOpen}
      />

      <OnboardingModal
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
      />

      <GuidedTour
        run={tourRunning}
        stepIndex={tourStepIndex}
        onStepChange={setTourStepIndex}
        onFinish={() => setTourRunning(false)}
      />
    </div>
  );
}
