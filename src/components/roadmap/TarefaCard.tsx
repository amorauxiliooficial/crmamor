import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TarefaInterna,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
  TASK_CATEGORY_LABELS,
  TASK_CATEGORY_COLORS,
  STATUS_TIMESTAMP_FIELD,
  TASK_STATUS_LABELS,
} from "@/types/tarefaInterna";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDuration, getDurationColor, isTaskOverdue } from "@/lib/timeUtils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface TarefaCardProps {
  tarefa: TarefaInterna;
  onClick: () => void;
  isDragging?: boolean;
  responsaveis?: { id: string; nome: string }[];
}

export function TarefaCard({
  tarefa,
  onClick,
  isDragging,
  responsaveis = [],
}: TarefaCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get the timestamp for current status column
  const timestampField = STATUS_TIMESTAMP_FIELD[tarefa.status];
  const currentTimestamp = tarefa[timestampField] as string | null;
  const duration = formatDuration(currentTimestamp);
  const durationColor = getDurationColor(currentTimestamp);
  const isOverdue = isTaskOverdue(currentTimestamp);

  // Get all time history
  const timeHistory = [
    { status: "backlog", timestamp: tarefa.backlog_at },
    { status: "priorizado", timestamp: tarefa.priorizado_at },
    { status: "em_progresso", timestamp: tarefa.em_progresso_at },
    { status: "concluido", timestamp: tarefa.concluido_at },
  ].filter((t) => t.timestamp);

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md active:scale-[0.98] md:hover:ring-2 md:hover:ring-primary/20",
        isDragging && "shadow-lg ring-2 ring-primary rotate-2",
        isOverdue && !isDragging && "ring-2 ring-destructive/70 bg-destructive/5"
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardContent className="p-3 space-y-2">
          {/* Category Badge + Time */}
          <div className="flex items-center justify-between gap-1.5">
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
            {duration && (
              <span className={cn("flex items-center gap-0.5 text-[10px] font-medium", durationColor)}>
                <Clock className="h-3 w-3" />
                {duration}
              </span>
            )}
          </div>

          {/* Title */}
          <h4 
            className="font-medium text-sm leading-tight line-clamp-2"
            onClick={onClick}
          >
            {tarefa.titulo}
          </h4>

          {/* Description preview */}
          {tarefa.descricao && !isExpanded && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {tarefa.descricao}
            </p>
          )}

          {/* Footer with expand button */}
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <div className="flex items-center gap-3">
              {tarefa.prazo && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(parseISO(tarefa.prazo), "dd/MM", { locale: ptBR })}
                </span>
              )}
              {responsaveis.length > 0 && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {responsaveis.length === 1
                    ? responsaveis[0].nome.split(" ")[0]
                    : `${responsaveis.length} pessoas`}
                </span>
              )}
            </div>
            <CollapsibleTrigger asChild>
              <button
                onClick={handleExpandClick}
                className="p-1 hover:bg-muted rounded-md transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </CollapsibleTrigger>
          </div>

          {/* Expanded Content */}
          <CollapsibleContent className="space-y-3 pt-2 border-t data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
            {/* Full description */}
            {tarefa.descricao && (
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Descrição
                </span>
                <p className="text-xs text-foreground whitespace-pre-wrap">
                  {tarefa.descricao}
                </p>
              </div>
            )}

            {/* Responsáveis list */}
            {responsaveis.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Responsáveis
                </span>
                <div className="flex flex-wrap gap-1">
                  {responsaveis.map((r) => (
                    <Badge key={r.id} variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                      {r.nome}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Time history */}
            {timeHistory.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Histórico de tempo
                </span>
                <div className="space-y-1">
                  {timeHistory.map((t) => (
                    <div key={t.status} className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">
                        {TASK_STATUS_LABELS[t.status as keyof typeof TASK_STATUS_LABELS]}
                      </span>
                      <span className="font-medium">
                        {t.timestamp && format(parseISO(t.timestamp), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Edit button */}
            <button
              onClick={onClick}
              className="w-full text-xs text-primary hover:underline text-center py-1"
            >
              Editar tarefa
            </button>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
