import { useState, useEffect, useCallback } from "react";
import { Search, LogOut, UserPlus, Settings, X, Key, Map } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { IndicacoesNotificacao } from "@/components/indicacoes/IndicacoesNotificacao";
import { PagamentosNotificacao } from "@/components/pagamentos/PagamentosNotificacao";
import { Indicacao } from "@/types/indicacao";
import { OnboardingAdminDialog } from "@/components/onboarding/OnboardingAdminDialog";
import { supabase } from "@/integrations/supabase/client";
import { MobileSidebar } from "./MobileSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import logoAam from "@/assets/logo-aam.png";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddMae?: () => void;
  onSelectIndicacao?: (indicacao: Indicacao) => void;
  onOpenOnboarding?: () => void;
  onViewChange?: (view: string) => void;
  currentView?: string;
}

export function Header({ 
  searchQuery, 
  onSearchChange, 
  onAddMae, 
  onSelectIndicacao, 
  onOpenOnboarding,
  onViewChange,
  currentView = "kanban",
}: HeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [onboardingProgress, setOnboardingProgress] = useState<number | null>(null);

  const fetchOnboardingProgress = useCallback(async () => {
    if (!user) return;

    const { data: items } = await supabase
      .from("onboarding_items")
      .select("id")
      .eq("ativo", true);

    if (!items || items.length === 0) {
      setOnboardingProgress(100);
      return;
    }

    const { data: progress } = await supabase
      .from("onboarding_progresso")
      .select("item_id, concluido")
      .eq("user_id", user.id);

    const completedIds = new Set(
      (progress ?? []).filter((p) => p.concluido).map((p) => p.item_id)
    );

    const percentage = Math.round((completedIds.size / items.length) * 100);
    setOnboardingProgress(percentage);
  }, [user]);

  useEffect(() => {
    const checkAdminAndProgress = async () => {
      if (!user) return;

      // Check if admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!roleData);

      // If not admin, check onboarding progress
      if (!roleData) {
        fetchOnboardingProgress();
      }
    };
    checkAdminAndProgress();
  }, [user, fetchOnboardingProgress]);

  // Update progress when onboarding UI changes it (same tab)
  useEffect(() => {
    if (!user || isAdmin) return;

    const handler = () => fetchOnboardingProgress();
    window.addEventListener("onboarding-progress-updated", handler);

    return () => {
      window.removeEventListener("onboarding-progress-updated", handler);
    };
  }, [user, isAdmin, fetchOnboardingProgress]);

  // Realtime subscription for onboarding progress updates
  useEffect(() => {
    if (!user || isAdmin) return;

    const channel = supabase
      .channel("onboarding-progress-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "onboarding_progresso",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchOnboardingProgress();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin, fetchOnboardingProgress]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const userEmail = user?.email || "";
  const userInitials = userEmail.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-14 md:h-16 items-center justify-between px-3 md:px-6">
        {/* Left: Mobile Menu + Logo */}
        <div className="flex items-center gap-2">
          <MobileSidebar
            onNavigate={onViewChange}
            currentView={currentView}
            onOpenOnboarding={onOpenOnboarding}
            isAdmin={isAdmin}
            onboardingProgress={onboardingProgress}
            onAdminClick={() => setAdminDialogOpen(true)}
          />
          
          <div className="flex items-center gap-3 tour-logo">
            <img 
              src={logoAam} 
              alt="AAM Logo" 
              className="h-12 w-12 md:h-14 md:w-14 object-contain"
              style={{ imageRendering: "auto" }}
            />
            <div className="hidden sm:block">
              <p className="font-semibold text-sm md:text-base truncate max-w-[180px] text-primary capitalize">
                {(user?.user_metadata?.full_name || userEmail.split("@")[0]).toLowerCase()}
              </p>
              <p className="text-xs text-muted-foreground">
                Bem-vindo(a)!
              </p>
            </div>
          </div>
        </div>

        {/* Center: Search (Desktop) or expanded mobile search */}
        {mobileSearchOpen ? (
          <div className="absolute inset-x-0 top-0 h-14 md:h-16 flex items-center px-3 bg-card z-10 md:hidden">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 pr-10"
                autoFocus
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-2"
              onClick={() => {
                setMobileSearchOpen(false);
                onSearchChange("");
              }}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 max-w-md mx-4 lg:mx-8 tour-search">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Mobile search trigger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Add button - always visible */}
          {onAddMae && (
            <Button onClick={onAddMae} size="sm" className="gap-2 tour-add-mae h-8 md:h-9 px-2 md:px-3">
              <UserPlus className="h-4 w-4" />
              <span className="hidden lg:inline">Nova Mãe</span>
            </Button>
          )}
          
          {/* Admin buttons - only for admins */}
          {isAdmin && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                className="hidden md:flex gap-2"
                onClick={() => navigate("/roadmap")}
              >
                <Map className="h-4 w-4" />
                <span className="hidden lg:inline">Roadmap</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="hidden md:flex gap-2 tour-onboarding"
                onClick={() => setAdminDialogOpen(true)}
              >
                <Settings className="h-4 w-4" />
                <span className="hidden lg:inline">Admin</span>
              </Button>
            </>
          )}
          
          <div className="tour-notifications flex items-center gap-0.5 md:gap-1">
            <PagamentosNotificacao />
            <IndicacoesNotificacao onSelectIndicacao={onSelectIndicacao} />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full tour-user-menu h-8 w-8 md:h-10 md:w-10">
                <Avatar className="h-7 w-7 md:h-8 md:w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">Minha conta</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {userEmail}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/senhas")}>
                <Key className="mr-2 h-4 w-4" />
                Senhas de Sistemas
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isAdmin && (
        <OnboardingAdminDialog
          open={adminDialogOpen}
          onOpenChange={setAdminDialogOpen}
          onRefresh={() => {}}
        />
      )}
    </header>
  );
}
