import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, CheckCircle, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface FollowUpBadgeProps {
  status: "ok" | "warning" | "overdue" | "no-activity";
  daysSinceActivity: number;
  compact?: boolean;
  className?: string;
}

const STATUS_CONFIG = {
  ok: {
    icon: CheckCircle,
    label: "Em dia",
    description: "Follow-up em dia",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  },
  warning: {
    icon: Clock,
    label: "Atenção",
    description: "Prazo de follow-up próximo",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
  overdue: {
    icon: AlertCircle,
    label: "Atrasado",
    description: "Follow-up atrasado!",
    className: "bg-destructive/15 text-destructive dark:bg-destructive/20 border-destructive/30 animate-pulse",
  },
  "no-activity": {
    icon: CircleDashed,
    label: "Novo",
    description: "Nenhuma atividade registrada",
    className: "bg-muted text-muted-foreground border-border",
  },
};

export function FollowUpBadge({ 
  status, 
  daysSinceActivity, 
  compact = false,
  className 
}: FollowUpBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const getTooltipMessage = () => {
    if (status === "no-activity") {
      return "Nenhuma atividade registrada";
    }
    if (daysSinceActivity === 0) {
      return "Contato feito hoje";
    }
    if (daysSinceActivity === 1) {
      return "1 dia sem contato";
    }
    return `${daysSinceActivity} dias sem contato`;
  };

  const displayLabel = compact 
    ? (status === "no-activity" ? "Novo" : `${daysSinceActivity}d`)
    : (status === "no-activity" ? "Sem atividade" : `${daysSinceActivity} dias`);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "h-5 px-1.5 py-0 gap-0.5 text-[10px] font-medium cursor-pointer border",
                config.className,
                className
              )}
            >
              <Icon className="h-2.5 w-2.5" />
              {displayLabel}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-[200px]">
            <p className="font-medium">{config.label}</p>
            <p className="text-muted-foreground">{getTooltipMessage()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium border",
        config.className,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{config.label}</span>
      <span className="opacity-70">({displayLabel})</span>
    </Badge>
  );
}
