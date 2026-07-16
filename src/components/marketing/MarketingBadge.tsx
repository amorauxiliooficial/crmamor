import { Badge } from "@/components/ui/badge";
import { Megaphone, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEtiquetas } from "@/hooks/useEtiquetas";

interface MarketingBadgeProps {
  etiqueta?: string | null;
  className?: string;
  compact?: boolean;
}

export function isMarketingEtiqueta(etiqueta?: string | null): boolean {
  if (!etiqueta) return false;
  return /\bmarketing\b/i.test(etiqueta);
}

/**
 * Selo de etiqueta para cards do funil.
 * Preserva a cor cadastrada, mas usa um tratamento suave para não competir
 * com alertas e dados operacionais do card.
 */
export function MarketingBadge({ etiqueta, className, compact = false }: MarketingBadgeProps) {
  const { data: etiquetas } = useEtiquetas();

  if (!etiqueta || !etiqueta.trim()) return null;

  const found = etiquetas?.find(
    (e) => e.nome.trim().toLowerCase() === etiqueta.trim().toLowerCase()
  );
  const cor = found?.cor || "#64748b";
  const isMkt = isMarketingEtiqueta(etiqueta);
  const Icon = isMkt ? Megaphone : Tag;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border font-medium text-foreground",
        compact ? "h-6 px-2 py-0 text-xs" : "h-7 px-2.5 py-0.5 text-xs",
        className
      )}
      style={{
        "--etiqueta-cor": cor,
        backgroundColor: "color-mix(in srgb, var(--etiqueta-cor) 9%, hsl(var(--card)))",
        borderColor: "color-mix(in srgb, var(--etiqueta-cor) 26%, hsl(var(--border)))",
      } as React.CSSProperties}
      title={`Etiqueta: ${etiqueta}`}
    >
      <Icon
        className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")}
        style={{ color: cor }}
      />
      <span className="truncate max-w-[140px]">{etiqueta}</span>
    </Badge>
  );
}
