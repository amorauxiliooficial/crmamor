import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface OperationsPanelProps {
  totalMaes: number;
  filteredCount: number;
}

export function OperationsPanel({
  totalMaes,
  filteredCount,
}: OperationsPanelProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3">
        <Card className="border-border/50 max-w-xs">
          <CardContent className="p-3 text-center">
            <Users className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-xl font-bold tabular-nums">{totalMaes}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Processos</p>
          </CardContent>
        </Card>
      </div>

      {filteredCount !== totalMaes && (
        <Badge variant="secondary" className="text-xs h-6">
          {filteredCount} de {totalMaes} processos
        </Badge>
      )}
    </div>
  );
}
