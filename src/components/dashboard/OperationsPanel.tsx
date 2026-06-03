import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Archive } from "lucide-react";

interface OperationsPanelProps {
  totalMaes: number;
  filteredCount: number;
  emAndamento: number;
  concluidos: number;
}

export function OperationsPanel({
  totalMaes,
  filteredCount,
  emAndamento,
  concluidos,
}: OperationsPanelProps) {
  return (
    <div className="space-y-3">
      <Card className="border-border/50 max-w-xs">
        <CardContent className="p-4">
          <div className="flex items-end gap-4">
            {/* Primary - Em andamento */}
            <div className="flex-1 min-w-0">
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

            {/* Divider */}
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
          </div>
        </CardContent>
      </Card>

      {filteredCount !== totalMaes && (
        <Badge variant="secondary" className="text-xs h-6">
          {filteredCount} de {totalMaes} processos
        </Badge>
      )}
    </div>
  );
}
