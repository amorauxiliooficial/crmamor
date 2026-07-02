import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarketingBadgeProps {
  etiqueta?: string | null;
  className?: string;
  compact?: boolean;
}

/**
 * Selo gritante para identificar mães provenientes do marketing.
 * Reconhece variações comuns da palavra "marketing" na etiqueta.
 */
export function isMarketingEtiqueta(etiqueta?: string | null): boolean {
  if (!etiqueta) return false;
  return /\bmarketing\b/i.test(etiqueta);
}

export function MarketingBadge({ etiqueta, className, compact = false }: MarketingBadgeProps) {
  if (!isMarketingEtiqueta(etiqueta)) return null;

  return (
    <Badge
      variant="default"
      className={cn(
        "gap-1 border font-bold",
        "bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 text-white",
        "border-white/40 hover:from-pink-400 hover:via-rose-400 hover:to-orange-400",
        compact ? "text-[10px] px-1.5 py-0 h-5" : "text-xs px-2.5 py-0.5",
        className
      )}
      title="Mãe do Marketing — priorizar abordagem"
    >
      <Megaphone className={cn(compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
      <span className="uppercase truncate max-w-[140px]">{etiqueta}</span>
    </Badge>
  );
}
