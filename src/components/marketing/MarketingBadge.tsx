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
 * Converte hex (#rrggbb) para rgba com alpha.
 */
function hexToRgba(hex: string, alpha: number): string | null {
  const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Selo genérico para qualquer etiqueta cadastrada.
 * Usa a cor definida no gerenciamento de etiquetas.
 * Etiquetas contendo "marketing" mantêm o visual gritante (gradiente).
 */
export function MarketingBadge({ etiqueta, className, compact = false }: MarketingBadgeProps) {
  const { data: etiquetas } = useEtiquetas();

  if (!etiqueta || !etiqueta.trim()) return null;

  const isMkt = isMarketingEtiqueta(etiqueta);

  if (isMkt) {
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
        <span className="truncate max-w-[140px]">{etiqueta}</span>
      </Badge>
    );
  }

  // Busca cor cadastrada (match case-insensitive pelo nome)
  const found = etiquetas?.find(
    (e) => e.nome.trim().toLowerCase() === etiqueta.trim().toLowerCase()
  );
  const cor = found?.cor || "#64748b"; // fallback slate

  const bg = hexToRgba(cor, 0.15) ?? "transparent";
  const border = hexToRgba(cor, 0.5) ?? cor;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-semibold border",
        compact ? "text-[10px] px-1.5 py-0 h-5" : "text-xs px-2.5 py-0.5",
        className
      )}
      style={{
        color: cor,
        backgroundColor: bg,
        borderColor: border,
      }}
      title={`Etiqueta: ${etiqueta}`}
    >
      <Tag className={cn(compact ? "h-2.5 w-2.5" : "h-3 w-3")} />
      <span className="truncate max-w-[140px]">{etiqueta}</span>
    </Badge>
  );
}
