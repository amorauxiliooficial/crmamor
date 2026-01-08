import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
  onClick?: () => void;
  isActive?: boolean;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
  onClick,
  isActive,
}: StatsCardProps) {
  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all cursor-pointer hover:shadow-md active:scale-[0.98] md:hover:scale-[1.02]",
        isActive && "ring-2 ring-primary shadow-md",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 md:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5 md:space-y-1 min-w-0">
            <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-xl md:text-3xl font-bold tracking-tight">{value}</p>
            {description && (
              <p className="text-[10px] md:text-xs text-muted-foreground truncate">{description}</p>
            )}
          </div>
          <div className="flex h-9 w-9 md:h-12 md:w-12 items-center justify-center rounded-full bg-primary/10 shrink-0">
            <Icon className="h-4 w-4 md:h-6 md:w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
