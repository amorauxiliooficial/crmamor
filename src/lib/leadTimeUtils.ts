import { parseISO } from "date-fns";

/**
 * Calcula minutos úteis entre duas datas, excluindo sábados e domingos integralmente.
 * Trabalha sobre intervalos por dia: se o dia é fim de semana, ignora; senão soma os minutos do dia.
 */
function businessMinutesBetween(start: Date, end: Date): number {
  if (end <= start) return 0;
  let total = 0;
  const cursor = new Date(start);

  while (cursor < end) {
    const dayEnd = new Date(cursor);
    dayEnd.setHours(23, 59, 59, 999);
    const sliceEnd = dayEnd < end ? dayEnd : end;
    const day = cursor.getDay(); // 0=dom, 6=sáb
    if (day !== 0 && day !== 6) {
      total += Math.floor((sliceEnd.getTime() - cursor.getTime()) / 60000);
    }
    // Próximo dia 00:00
    const next = new Date(cursor);
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    cursor.setTime(next.getTime());
  }
  return total;
}

/**
 * Formata o tempo útil desde uma data ISO (ignora sábados/domingos).
 */
export function formatTimeSince(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = parseISO(iso);
  const minutes = businessMinutesBetween(date, new Date());

  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d úteis`;

  const weeks = Math.floor(days / 5); // 5 dias úteis por semana
  if (weeks < 4) return `${weeks}sem`;

  const months = Math.floor(days / 22); // ~22 dias úteis por mês
  return `${months}m`;
}

/**
 * Define cor/urgência baseado em HORAS ÚTEIS (excluindo fim de semana):
 * - < 4h  : fresco
 * - 4-24h : atenção (até 1 dia útil)
 * - 24-48h: esfriando (1-2 dias úteis)
 * - > 48h : frio (+ de 2 dias úteis)
 */
export type LeadHeat = "fresh" | "warm" | "cooling" | "cold";

export function getLeadHeat(iso: string | null | undefined): LeadHeat | null {
  if (!iso) return null;
  const date = parseISO(iso);
  const hours = businessMinutesBetween(date, new Date()) / 60;
  if (hours < 4) return "fresh";
  if (hours < 24) return "warm";
  if (hours < 48) return "cooling";
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
