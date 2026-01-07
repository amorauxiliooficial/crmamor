import { useState, useEffect } from "react";
import { Heart, Search, LogOut, UserPlus, BookOpen, Settings, ClipboardList } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Indicacao } from "@/types/indicacao";
import { OnboardingAdminDialog } from "@/components/onboarding/OnboardingAdminDialog";
import { supabase } from "@/integrations/supabase/client";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddMae?: () => void;
  onSelectIndicacao?: (indicacao: Indicacao) => void;
  onOpenOnboarding?: () => void;
}

export function Header({ searchQuery, onSearchChange, onAddMae, onSelectIndicacao, onOpenOnboarding }: HeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [onboardingProgress, setOnboardingProgress] = useState<number | null>(null);

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
        const { data: items } = await supabase
          .from("onboarding_items")
          .select("id")
          .eq("ativo", true);
        
        if (items && items.length > 0) {
          const { data: progress } = await supabase
            .from("onboarding_progresso")
            .select("item_id, concluido")
            .eq("user_id", user.id);
          
          const completedCount = progress?.filter(p => p.concluido).length || 0;
          const percentage = Math.round((completedCount / items.length) * 100);
          setOnboardingProgress(percentage);
        } else {
          setOnboardingProgress(100);
        }
      }
    };
    checkAdminAndProgress();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const userEmail = user?.email || "";
  const userInitials = userEmail.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3 tour-logo">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
            <Heart className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">AAM</h1>
            <p className="text-xs text-muted-foreground">
              Amor Auxílio Maternidade
            </p>
          </div>
        </div>

        <div className="flex-1 max-w-md mx-8 tour-search">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onAddMae && (
            <Button onClick={onAddMae} size="sm" className="gap-2 tour-add-mae">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova Mãe</span>
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 tour-playbook"
            onClick={() => navigate("/playbook")}
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Playbook</span>
          </Button>

          {isAdmin ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 tour-onboarding"
              onClick={() => setAdminDialogOpen(true)}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Admin Onboarding</span>
            </Button>
          ) : onOpenOnboarding && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 tour-onboarding relative"
              onClick={onOpenOnboarding}
            >
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Onboarding</span>
              {onboardingProgress !== null && onboardingProgress < 100 && (
                <Badge 
                  variant="destructive" 
                  className="ml-1 h-5 px-1.5 text-[10px] font-semibold animate-pulse"
                >
                  {onboardingProgress}%
                </Badge>
              )}
            </Button>
          )}
          
          <div className="tour-notifications">
            <IndicacoesNotificacao onSelectIndicacao={onSelectIndicacao} />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full tour-user-menu">
                <Avatar className="h-8 w-8">
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
