import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Archive, XCircle, MessageSquareWarning, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface OperationsPanelProps {
  totalMaes: number;
  filteredCount: number;
  emAndamento: number;
  concluidos: number;
  encerradosSemExito: number;
  semContato: number;
  semSenha: number;
  filtroAtivo?: "contato" | "senha" | null;
  onFiltroChange?: (filtro: "contato" | "senha" | null) => void;
}

export function OperationsPanel({
  totalMaes,
  filteredCount,
  emAndamento,
  concluidos,
  encerradosSemExito,
  semContato,
  semSenha,
  filtroAtivo = null,
  onFiltroChange,
}: OperationsPanelProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(420px,1.35fr)_minmax(360px,1fr)]">
        <Card className="border-border/50 shadow-[inset_0_2px_0_hsl(var(--primary)/0.35)]">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[120px] flex-1">
                <div className="mb-1 flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" />
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Em andamento
                  </p>
                </div>
                <p className="text-3xl font-bold leading-none tabular-nums">{emAndamento}</p>
              </div>

              <div className="h-10 w-px bg-border/60" aria-hidden="true" />

              <div className="shrink-0">
                <div className="mb-1 flex items-center gap-1">
                  <Archive className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Concluídos</p>
                </div>
                <p className="text-lg font-semibold leading-none text-muted-foreground tabular-nums">{concluidos}</p>
              </div>

              <div className="h-10 w-px bg-border/60" aria-hidden="true" />

              <div className="shrink-0">
                <div className="mb-1 flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sem êxito</p>
                </div>
                <p className="text-lg font-semibold leading-none text-muted-foreground tabular-nums">{encerradosSemExito}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-3">
            <p className="mb-2 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Acompanhamento
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={filtroAtivo === "contato"}
                className={cn(
                  "flex min-w-0 items-center gap-2.5 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:bg-muted/60",
                  filtroAtivo === "contato" && "border-primary/30 bg-primary/5",
                )}
                onClick={() => onFiltroChange?.(filtroAtivo === "contato" ? null : "contato")}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MessageSquareWarning className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xl font-semibold leading-none tabular-nums">{semContato}</span>
                  <span className="mt-1 block text-xs leading-tight text-muted-foreground">Sem contato há 7+ dias</span>
                </span>
              </button>

              <button
                type="button"
                aria-pressed={filtroAtivo === "senha"}
                className={cn(
                  "flex min-w-0 items-center gap-2.5 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:bg-muted/60",
                  filtroAtivo === "senha" && "border-amber-300/60 bg-amber-50/60 dark:border-amber-700/50 dark:bg-amber-950/20",
                )}
                onClick={() => onFiltroChange?.(filtroAtivo === "senha" ? null : "senha")}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  <KeyRound className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xl font-semibold leading-none tabular-nums">{semSenha}</span>
                  <span className="mt-1 block text-xs leading-tight text-muted-foreground">Sem senha há 7+ dias</span>
                </span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {filteredCount !== totalMaes && (
        <Badge variant="secondary" className="h-6 text-xs">
          {filteredCount} de {totalMaes} processos
        </Badge>
      )}
    </div>
  );
}
