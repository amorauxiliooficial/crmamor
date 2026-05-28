import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ForecastPipelineCardProps {
  title: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "primary";
}

const TONES: Record<string, string> = {
  default: "from-muted/40 to-transparent text-foreground",
  success: "from-emerald-500/15 to-transparent text-emerald-600 dark:text-emerald-400",
  warning: "from-amber-500/15 to-transparent text-amber-600 dark:text-amber-400",
  danger: "from-rose-500/15 to-transparent text-rose-600 dark:text-rose-400",
  primary: "from-primary/20 to-transparent text-primary",
};

export function ForecastPipelineCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "default",
}: ForecastPipelineCardProps) {
  return (
    <Card className="overflow-hidden border-border/60 hover:shadow-md transition-all">
      <CardContent className={cn("relative p-4 md:p-5 bg-gradient-to-br", TONES[tone])}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
              {title}
            </p>
            <p className="text-xl md:text-2xl font-bold tracking-tight">{value}</p>
            {description && (
              <p className="text-[11px] text-muted-foreground line-clamp-2">{description}</p>
            )}
          </div>
          <div className="shrink-0 h-9 w-9 rounded-full bg-background/60 backdrop-blur flex items-center justify-center">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
