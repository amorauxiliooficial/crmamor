import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Menu,
  Heart,
  LayoutGrid,
  List,
  Baby,
  ClipboardCheck,
  DollarSign,
  UserPlus,
  BookOpen,
  Settings,
  ClipboardList,
  LogOut,
  X,
  Megaphone,
  PiggyBank,
  Brain,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface MobileSidebarProps {
  onNavigate?: (view: string) => void;
  currentView?: string;
  onOpenOnboarding?: () => void;
  isAdmin?: boolean;
  onboardingProgress?: number | null;
  onAdminClick?: () => void;
}

const navigationItems = [
  { id: "kanban", label: "Processos", icon: LayoutGrid },
  { id: "table", label: "Tabela", icon: List },
  { id: "gestantes", label: "Gestantes", icon: Baby },
  { id: "conferencia", label: "Conferência INSS", icon: ClipboardCheck },
  { id: "pagamentos", label: "Pagamentos", icon: DollarSign },
  { id: "indicacoes", label: "Indicações", icon: UserPlus },
  { id: "pre-analises", label: "Pré-Análises", icon: Brain, isPage: true },
  { id: "marketing", label: "Marketing", icon: Megaphone, isPage: true },
  { id: "comissoes", label: "Comissões", icon: PiggyBank, isPage: true },
];

export function MobileSidebar({
  onNavigate,
  currentView = "kanban",
  onOpenOnboarding,
  isAdmin = false,
  onboardingProgress,
  onAdminClick,
}: MobileSidebarProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();

  const handleNavigate = (item: typeof navigationItems[0]) => {
    if ((item as any).isPage) {
      navigate(`/${item.id}`);
    } else if (onNavigate) {
      onNavigate(item.id);
    }
    setOpen(false);
  };

  const handlePlaybook = () => {
    navigate("/playbook");
    setOpen(false);
  };

  const handleOnboarding = () => {
    if (isAdmin && onAdminClick) {
      onAdminClick();
    } else if (onOpenOnboarding) {
      onOpenOnboarding();
    }
    setOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85vw] max-w-[300px] p-0">
        <SheetHeader className="p-3 border-b">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
              <Heart className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <SheetTitle className="text-left text-base">AAM</SheetTitle>
              <p className="text-[11px] text-muted-foreground">
                Amor Auxílio Maternidade
              </p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100vh-160px)]">
          <div className="p-3 space-y-0.5">
            <p className="text-[10px] font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">
              Visualizações
            </p>
            {navigationItems.map((item) => (
              <Button
                key={item.id}
                variant={currentView === item.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2.5 h-10 text-sm",
                  currentView === item.id && "bg-primary/10 text-primary font-medium"
                )}
                onClick={() => handleNavigate(item)}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </div>

          <Separator className="my-2" />

          <div className="p-3 space-y-0.5">
            <p className="text-[10px] font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">
              Ferramentas
            </p>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2.5 h-10 text-sm"
              onClick={handlePlaybook}
            >
              <BookOpen className="h-4 w-4" />
              Playbook
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2.5 h-10 text-sm relative"
              onClick={handleOnboarding}
            >
              {isAdmin ? (
                <>
                  <Settings className="h-4 w-4" />
                  Admin Onboarding
                </>
              ) : (
                <>
                  <ClipboardList className="h-4 w-4" />
                  Onboarding
                  {onboardingProgress !== null && onboardingProgress < 100 && (
                    <Badge
                      variant="destructive"
                      className="ml-auto h-5 px-1.5 text-[10px] font-semibold"
                    >
                      {onboardingProgress}%
                    </Badge>
                  )}
                </>
              )}
            </Button>
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t bg-background">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2.5 h-10 text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
