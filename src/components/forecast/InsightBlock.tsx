import { cn } from "@/lib/utils";

interface InsightRow {
  label: string;
  value: string;
  tone?: "default" | "danger" | "warning" | "success" | "info";
  hint?: string;
  onClick?: () => void;
}

interface InsightBlockProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconTone?: "default" | "danger" | "warning" | "success" | "info" | "primary";
  rows: InsightRow[];
  emptyText?: string;
}

const TONE_TEXT: Record<string, string> = {
  default: "text-foreground",
  danger: "text-rose-600 dark:text-rose-400",
  warning: "text-amber-600 dark:text-amber-400",
  success: "text-emerald-600 dark:text-emerald-400",
  info: "text-sky-600 dark:text-sky-400",
};

const ICON_BG: Record<string, string> = {
  default: "bg-muted text-foreground",
  primary: "bg-primary/15 text-primary",
  danger: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  info: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
};

export function InsightBlock({ title, icon: Icon, iconTone = "default", rows, emptyText = "Nenhum item" }: InsightBlockProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", ICON_BG[iconTone])}>
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground italic pl-1">{emptyText}</p>
      ) : (
        <div className="space-y-1">
          {rows.map((row, i) => {
            const content = (
              <>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{row.label}</div>
                  {row.hint && <div className="text-xs text-muted-foreground truncate mt-0.5">{row.hint}</div>}
                </div>
                <div className={cn("text-xs font-bold tabular-nums shrink-0", TONE_TEXT[row.tone ?? "default"])}>
                  {row.value}
                </div>
              </>
            );
            return row.onClick ? (
              <button
                key={i}
                type="button"
                onClick={row.onClick}
                className="w-full flex items-center justify-between gap-3 py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
              >
                {content}
              </button>
            ) : (
              <div key={i} className="flex items-center justify-between gap-3 py-1.5 px-2 rounded-lg">
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
