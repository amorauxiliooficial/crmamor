import { differenceInMinutes, differenceInHours, differenceInDays, parseISO } from "date-fns";

/**
 * Formats duration from a timestamp to now in a human-readable format
 */
export function formatDuration(timestamp: string | null | undefined): string | null {
  if (!timestamp) return null;
  
  const date = parseISO(timestamp);
  const now = new Date();
  
  const totalMinutes = differenceInMinutes(now, date);
  
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }
  
  const hours = differenceInHours(now, date);
  if (hours < 24) {
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  
  const days = differenceInDays(now, date);
  const remainingHours = hours % 24;
  
  if (days < 7) {
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
  
  const weeks = Math.floor(days / 7);
  const remainingDays = days % 7;
  
  if (weeks < 4) {
    return remainingDays > 0 ? `${weeks}sem ${remainingDays}d` : `${weeks}sem`;
  }
  
  const months = Math.floor(days / 30);
  return `${months}mês${months > 1 ? "es" : ""}`;
}

/**
 * Get duration color based on how long task has been in column
 */
export function getDurationColor(timestamp: string | null | undefined): string {
  if (!timestamp) return "text-muted-foreground";
  
  const date = parseISO(timestamp);
  const days = differenceInDays(new Date(), date);
  
  if (days < 3) return "text-green-600 dark:text-green-400";
  if (days < 7) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

/**
 * Check if task is overdue (more than 7 days in same status)
 */
export function isTaskOverdue(timestamp: string | null | undefined): boolean {
  if (!timestamp) return false;
  
  const date = parseISO(timestamp);
  const days = differenceInDays(new Date(), date);
  
  return days >= 7;
}
