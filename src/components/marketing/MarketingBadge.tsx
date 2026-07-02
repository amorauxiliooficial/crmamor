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
 * Retorna cor de texto (branco ou preto) com melhor contraste sobre a cor de fundo.
 */
function contrastText(hex: string): string {
  const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return "#ffffff";
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  // luminância percebida
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#111827" : "#ffffff";
}

/**
 * Selo de etiqueta para cards do funil.
 * Usa a cor cadastrada no gerenciador de etiquetas.
 */
export function MarketingBadge({ etiqueta, className, compact = false }: MarketingBadgeProps) {
  const { data: etiquetas } = useEtiquetas();

  if (!etiqueta || !etiqueta.trim()) return null;

  const found = etiquetas?.find(
    (e) => e.nome.trim().toLowerCase() === etiqueta.trim().toLowerCase()
  );
  const cor = found?.cor || "#64748b";
  const textColor = contrastText(cor);
  const isMkt = isMarketingEtiqueta(etiqueta);
  const Icon = isMkt ? Megaphone : Tag;

  return (
    <Badge
      variant="default"
      className={cn(
        "gap-1 border font-semibold",
        compact ? "text-[10px] px-1.5 py-0 h-5" : "text-xs px-2.5 py-0.5",
        className
      )}
      style={{
        backgroundColor: cor,
        color: textColor,
        borderColor: cor,
      }}
      title={`Etiqueta: ${etiqueta}`}
    >
      <Icon className={cn(compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
      <span className="truncate max-w-[140px]">{etiqueta}</span>
    </Badge>
  );
}
