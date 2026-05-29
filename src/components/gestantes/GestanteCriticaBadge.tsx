import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MaeProcesso } from "@/types/mae";
import { isGestanteCritica } from "@/lib/gestacaoUtils";

interface GestanteCriticaBadgeProps {
  mae: MaeProcesso;
  className?: string;
  compact?: boolean;
}

/**
 * Pílula magenta pulsante exibida em mães gestantes no 7º/8º mês.
 * Sinaliza necessidade de contato imediato antes de entrar no fluxo operacional.
 */
export function GestanteCriticaBadge({ mae, className, compact = false }: GestanteCriticaBadgeProps) {
  if (!isGestanteCritica(mae)) return null;

  return (
    <Badge
      variant="default"
      className={cn(
        "gap-1 bg-primary/15 text-primary border border-primary/40 hover:bg-primary/20 animate-pulse",
        compact ? "text-[10px] px-1.5 py-0 h-5" : "text-[11px] px-2 py-0.5",
        className
      )}
      title="Gestante no 7º/8º mês — entrar em contato"
    >
      <Bell className={cn(compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
      {compact ? "7-8m" : "Contato 7-8m"}
    </Badge>
  );
}
