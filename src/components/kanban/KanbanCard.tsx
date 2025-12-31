import { MaeProcesso } from "@/types/mae";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText } from "lucide-react";
import { formatCpf } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface KanbanCardProps {
  mae: MaeProcesso;
  onClick: () => void;
  isDragging?: boolean;
}

export function KanbanCard({ mae, onClick, isDragging }: KanbanCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-primary/20",
        isDragging && "shadow-lg ring-2 ring-primary rotate-2"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-sm leading-tight line-clamp-2">
              {mae.nome_mae}
            </h4>
            {mae.contrato_assinado && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                Contrato
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground font-mono">
            {formatCpf(mae.cpf)}
          </p>

          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs">
              {mae.tipo_evento}
            </Badge>
            {mae.uf && (
              <Badge variant="outline" className="text-xs">
                {mae.uf}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {mae.data_evento && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(mae.data_evento).toLocaleDateString("pt-BR")}
              </span>
            )}
            {mae.protocolo_inss && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Protocolo
              </span>
            )}
          </div>

          {mae.observacoes && (
            <p className="text-xs text-muted-foreground italic line-clamp-2 border-t pt-2">
              {mae.observacoes}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
