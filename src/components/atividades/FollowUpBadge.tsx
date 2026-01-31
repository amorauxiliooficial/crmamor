import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle, MessageCircleWarning } from "lucide-react";
import { cn } from "@/lib/utils";

interface FollowUpBadgeProps {
  status: "ok" | "warning" | "overdue" | "no-activity";
  daysSinceActivity: number;
  compact?: boolean;
  className?: string;
}

export function FollowUpBadge({ 
  status, 
  daysSinceActivity, 
  compact = false,
  className 
}: FollowUpBadgeProps) {
  const config = {
    ok: {
      icon: CheckCircle,
      label: compact ? `${daysSinceActivity}d` : `${daysSinceActivity} dias`,
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200",
    },
    warning: {
      icon: Clock,
      label: compact ? `${daysSinceActivity}d` : `${daysSinceActivity} dias`,
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200",
    },
    overdue: {
      icon: AlertTriangle,
      label: compact ? `${daysSinceActivity}d` : `${daysSinceActivity} dias`,
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 animate-pulse",
    },
    "no-activity": {
      icon: MessageCircleWarning,
      label: compact ? "Novo" : "Sem atividade",
      className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200",
    },
  };

  const { icon: Icon, label, className: badgeClass } = config[status];

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "text-[10px] px-1.5 py-0 h-5 gap-0.5 font-medium border",
        badgeClass,
        className
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </Badge>
  );
}
