import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TarefaInterna,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
  TASK_CATEGORY_LABELS,
  TASK_CATEGORY_COLORS,
} from "@/types/tarefaInterna";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TarefaCardProps {
  tarefa: TarefaInterna;
  onClick: () => void;
  isDragging?: boolean;
  responsavelNome?: string;
}

export function TarefaCard({
  tarefa,
  onClick,
  isDragging,
  responsavelNome,
}: TarefaCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md active:scale-[0.98] md:hover:ring-2 md:hover:ring-primary/20",
        isDragging && "shadow-lg ring-2 ring-primary rotate-2"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        {/* Category Badge */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant="secondary"
            className={cn("text-[10px] px-1.5 py-0 h-5", TASK_CATEGORY_COLORS[tarefa.categoria])}
          >
            {TASK_CATEGORY_LABELS[tarefa.categoria]}
          </Badge>
          <Badge
            variant="secondary"
            className={cn("text-[10px] px-1.5 py-0 h-5", TASK_PRIORITY_COLORS[tarefa.prioridade])}
          >
            {TASK_PRIORITY_LABELS[tarefa.prioridade]}
          </Badge>
        </div>

        {/* Title */}
        <h4 className="font-medium text-sm leading-tight line-clamp-2">
          {tarefa.titulo}
        </h4>

        {/* Description */}
        {tarefa.descricao && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {tarefa.descricao}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
          {tarefa.prazo && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(parseISO(tarefa.prazo), "dd/MM", { locale: ptBR })}
            </span>
          )}
          {responsavelNome && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {responsavelNome.split(" ")[0]}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
