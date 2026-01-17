import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { MarketingCalendar } from "@/components/marketing/MarketingCalendar";
import { TiposConteudoLegenda } from "@/components/marketing/TiposConteudoLegenda";
import { CriativoDialog } from "@/components/marketing/CriativoDialog";
import { Criativo } from "@/types/marketing";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Marketing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCriativo, setSelectedCriativo] = useState<Criativo | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  const handleAddCriativo = (date: Date) => {
    setSelectedCriativo(null);
    setSelectedDate(date);
    setDialogOpen(true);
  };

  const handleEditCriativo = (criativo: Criativo) => {
    setSelectedCriativo(criativo);
    setSelectedDate(null);
    setDialogOpen(true);
  };

  const handleNewCriativo = () => {
    setSelectedCriativo(null);
    setSelectedDate(new Date());
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-14 md:h-16 items-center justify-between px-3 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-primary">
                <Calendar className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-base md:text-lg">Marketing</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Calendário de Conteúdo
                </p>
              </div>
            </div>
          </div>

          <Button onClick={handleNewCriativo} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo Criativo</span>
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 p-3 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 min-h-0">
        {/* Sidebar com legenda */}
        <aside className={isMobile ? "order-2" : "w-64 shrink-0"}>
          <TiposConteudoLegenda />
        </aside>

        {/* Calendário */}
        <main className="flex-1 min-h-0 flex flex-col order-1 md:order-2">
          <MarketingCalendar
            onAddCriativo={handleAddCriativo}
            onEditCriativo={handleEditCriativo}
          />
        </main>
      </div>

      <CriativoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        criativo={selectedCriativo}
        selectedDate={selectedDate}
      />
    </div>
  );
}
