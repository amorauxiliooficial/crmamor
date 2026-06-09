import { differenceInMinutes, differenceInHours, differenceInDays, parseISO } from "date-fns";

/**
 * Formata o tempo desde uma data ISO em formato curto (ex: "2h", "3d", "1sem").
 */
export function formatTimeSince(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = parseISO(iso);
  const now = new Date();

  const minutes = differenceInMinutes(now, date);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min`;

  const hours = differenceInHours(now, date);
  if (hours < 24) return `${hours}h`;

  const days = differenceInDays(now, date);
  if (days < 7) return `${days}d`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}sem`;

  const months = Math.floor(days / 30);
  return `${months}m`;
}

/**
 * Define cor/urgência do lead com base em horas desde atribuição:
 * - < 4h  : verde (fresco)
 * - 4-24h : amarelo (atenção)
 * - 1-3d  : laranja (esfriando)
 * - > 3d  : vermelho (frio)
 */
export type LeadHeat = "fresh" | "warm" | "cooling" | "cold";

export function getLeadHeat(iso: string | null | undefined): LeadHeat | null {
  if (!iso) return null;
  const date = parseISO(iso);
  const hours = differenceInHours(new Date(), date);
  if (hours < 4) return "fresh";
  if (hours < 24) return "warm";
  if (hours < 72) return "cooling";
  return "cold";
}

export const leadHeatClasses: Record<LeadHeat, string> = {
  fresh: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  warm: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  cooling: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  cold: "bg-destructive/15 text-destructive border-destructive/30",
};

export const leadHeatLabels: Record<LeadHeat, string> = {
  fresh: "Fresco",
  warm: "Atenção",
  cooling: "Esfriando",
  cold: "Frio",
};
