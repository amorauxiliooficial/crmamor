import { TarefaInterna, TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from "@/types/tarefaInterna";
import { TarefaCard } from "./TarefaCard";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Draggable } from "@hello-pangea/dnd";

interface TarefaColumnProps {
  status: TaskStatus;
  tarefas: TarefaInterna[];
  onCardClick: (tarefa: TarefaInterna) => void;
  isDraggingOver?: boolean;
  usuarios: Record<string, string>;
  responsaveisPorTarefa: Record<string, string[]>;
}

export function TarefaColumn({
  status,
  tarefas,
  onCardClick,
  isDraggingOver,
  usuarios,
  responsaveisPorTarefa,
}: TarefaColumnProps) {
  const statusLabel = TASK_STATUS_LABELS[status].split(" ").slice(1).join(" ");
  const emoji = TASK_STATUS_LABELS[status].split(" ")[0];

  // Helper to get responsaveis with names for a tarefa
  const getResponsaveisComNomes = (tarefaId: string) => {
    const userIds = responsaveisPorTarefa[tarefaId] || [];
    return userIds.map((id) => ({ id, nome: usuarios[id] || "Desconhecido" }));
  };

  return (
    <div
      className={cn(
        "flex h-full w-[280px] flex-shrink-0 flex-col rounded-lg border bg-card transition-all duration-200",
        isDraggingOver && "ring-2 ring-primary bg-primary/5"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b px-4 py-3",
          TASK_STATUS_COLORS[status]
        )}
      >
        <span className="text-lg">{emoji}</span>
        <h3 className="font-semibold text-sm">{statusLabel}</h3>
        <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-medium">
          {tarefas.length}
        </span>
      </div>
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2 min-h-[100px]">
          {tarefas.map((tarefa, index) => (
            <Draggable key={tarefa.id} draggableId={tarefa.id} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                >
                  <TarefaCard
                    tarefa={tarefa}
                    onClick={() => onCardClick(tarefa)}
                    isDragging={snapshot.isDragging}
                    responsaveis={getResponsaveisComNomes(tarefa.id)}
                  />
                </div>
              )}
            </Draggable>
          ))}
          {tarefas.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma tarefa
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
