import { MessageSquare, LayoutGrid, Activity, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileTab = "conversas" | "kanban" | "atividades";

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  onOpenCrmDrawer?: () => void;
  showCrmButton?: boolean;
  unreadCount?: number;
}

const TABS: { value: MobileTab; label: string; icon: React.ElementType }[] = [
  { value: "conversas", label: "Conversas", icon: MessageSquare },
  { value: "kanban", label: "Kanban", icon: LayoutGrid },
  { value: "atividades", label: "Atividades", icon: Activity },
];

export function MobileBottomNav({
  activeTab,
  onTabChange,
  onOpenCrmDrawer,
  showCrmButton = false,
  unreadCount = 0,
}: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 safe-area-bottom">
      <div className="flex items-stretch">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors relative",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground/60 active:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {tab.value === "conversas" && unreadCount > 0 && (
                <span className="absolute top-1.5 right-1/4 bg-primary text-primary-foreground h-4 min-w-4 px-1 flex items-center justify-center rounded-full text-[9px] font-bold">
                  {unreadCount}
                </span>
              )}
              {isActive && (
                <span className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
        {showCrmButton && (
          <button
            onClick={onOpenCrmDrawer}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-muted-foreground/60 active:text-foreground transition-colors"
          >
            <Info className="h-5 w-5" />
            <span className="text-[10px] font-medium">CRM</span>
          </button>
        )}
      </div>
    </nav>
  );
}
