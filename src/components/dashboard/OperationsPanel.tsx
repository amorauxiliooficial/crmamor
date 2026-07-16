import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Archive, XCircle, MessageSquareWarning, KeyRound, ChevronRight } from "lucide-react";
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
      <div className="grid gap-3 lg:grid-cols-[minmax(420px,1.25fr)_minmax(240px,0.75fr)_minmax(240px,0.75fr)]">
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-end gap-4 flex-wrap">
            {/* Primary - Em andamento */}
            <div className="flex-1 min-w-[120px]">
              <div className="flex items-center gap-1.5 mb-1">
                <Users className="h-4 w-4 text-primary" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Em andamento
                </p>
              </div>
              <p className="text-3xl font-bold tabular-nums leading-none">
                {emAndamento}
              </p>
            </div>

            <div className="h-10 w-px bg-border/60" aria-hidden="true" />

            {/* Secondary - Concluídos */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-1 mb-1">
                <Archive className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Concluídos
                </p>
              </div>
              <p className="text-lg font-semibold tabular-nums leading-none text-muted-foreground">
                {concluidos}
              </p>
            </div>

            <div className="h-10 w-px bg-border/60" aria-hidden="true" />

            {/* Tertiary - Encerrados sem êxito */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-1 mb-1">
                <XCircle className="h-3 w-3 text-amber-600 dark:text-amber-500/80" />
                <p className="text-[10px] text-amber-700/80 dark:text-amber-500/80 uppercase tracking-wider">
                  Sem êxito
                </p>
              </div>
              <p className="text-lg font-semibold tabular-nums leading-none text-amber-700/90 dark:text-amber-500/80">
                {encerradosSemExito}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <button type="button" className="text-left" onClick={() => onFiltroChange?.(filtroAtivo === "contato" ? null : "contato")}>
        <Card className={cn(
          "h-full border-2 transition-all hover:-translate-y-0.5 hover:shadow-md",
          semContato > 0 ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30" : "border-border/50",
          filtroAtivo === "contato" && "ring-2 ring-red-500 ring-offset-2"
        )}>
          <CardContent className="flex h-full items-center gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300">
              <MessageSquareWarning className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-3xl font-bold tabular-nums text-red-700 dark:text-red-300">{semContato}</p>
              <p className="text-sm font-semibold">Sem contato há 7 dias ou mais</p>
              <p className="text-xs text-muted-foreground">Clique para priorizar</p>
            </div>
            <ChevronRight className="h-5 w-5 text-red-500" />
          </CardContent>
        </Card>
      </button>

      <button type="button" className="text-left" onClick={() => onFiltroChange?.(filtroAtivo === "senha" ? null : "senha")}>
        <Card className={cn(
          "h-full border-2 transition-all hover:-translate-y-0.5 hover:shadow-md",
          semSenha > 0 ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30" : "border-border/50",
          filtroAtivo === "senha" && "ring-2 ring-amber-500 ring-offset-2"
        )}>
          <CardContent className="flex h-full items-center gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
              <KeyRound className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-3xl font-bold tabular-nums text-amber-700 dark:text-amber-300">{semSenha}</p>
              <p className="text-sm font-semibold">Sem senha há 7 dias ou mais</p>
              <p className="text-xs text-muted-foreground">Clique para priorizar</p>
            </div>
            <ChevronRight className="h-5 w-5 text-amber-500" />
          </CardContent>
        </Card>
      </button>
      </div>

      {filteredCount !== totalMaes && (
        <Badge variant="secondary" className="text-xs h-6">
          {filteredCount} de {totalMaes} processos
        </Badge>
      )}
    </div>
  );
}
