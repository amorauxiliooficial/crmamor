import { useState } from "react";
import { TarefaInterna, TaskStatus, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from "@/types/tarefaInterna";
import { TarefaCard } from "./TarefaCard";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Draggable } from "@hello-pangea/dnd";
import { Plus, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TarefaColumnProps {
  status: TaskStatus;
  tarefas: TarefaInterna[];
  onCardClick: (tarefa: TarefaInterna) => void;
  isDraggingOver?: boolean;
  usuarios: Record<string, string>;
  responsaveisPorTarefa: Record<string, string[]>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onQuickAdd: (titulo: string, status: TaskStatus) => Promise<unknown>;
}

export function TarefaColumn({
  status,
  tarefas,
  onCardClick,
  isDraggingOver,
  usuarios,
  responsaveisPorTarefa,
  isExpanded,
  onToggleExpand,
  onQuickAdd,
}: TarefaColumnProps) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const statusLabel = TASK_STATUS_LABELS[status].split(" ").slice(1).join(" ");
  const emoji = TASK_STATUS_LABELS[status].split(" ")[0];

  // Helper to get responsaveis with names for a tarefa
  const getResponsaveisComNomes = (tarefaId: string) => {
    const userIds = responsaveisPorTarefa[tarefaId] || [];
    return userIds.map((id) => ({ id, nome: usuarios[id] || "Desconhecido" }));
  };

  const handleQuickAdd = async () => {
    if (!newTaskTitle.trim()) return;
    setIsSubmitting(true);
    await onQuickAdd(newTaskTitle.trim(), status);
    setNewTaskTitle("");
    setIsAddingTask(false);
    setIsSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleQuickAdd();
    } else if (e.key === "Escape") {
      setIsAddingTask(false);
      setNewTaskTitle("");
    }
  };

  return (
    <div
      className={cn(
        "flex h-full flex-shrink-0 flex-col rounded-lg border bg-card transition-all duration-300 animate-fade-in",
        isExpanded ? "w-[280px]" : "w-[48px] cursor-pointer",
        isDraggingOver && "ring-2 ring-primary bg-primary/5 scale-[1.02]"
      )}
      onClick={!isExpanded ? onToggleExpand : undefined}
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b px-4 py-3 cursor-pointer transition-colors duration-200",
          TASK_STATUS_COLORS[status],
          !isExpanded && "flex-col px-2 py-4"
        )}
        onClick={isExpanded ? onToggleExpand : undefined}
      >
        <span className="text-lg">{emoji}</span>
        {isExpanded ? (
          <>
            <h3 className="font-semibold text-sm flex-1">{statusLabel}</h3>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-medium">
              {tarefas.length}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsAddingTask(true);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
              title="Adicionar tarefa"
            >
              <Plus className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background text-[10px] font-medium">
              {tarefas.length}
            </span>
            <span
              className="text-[10px] font-medium text-center mt-2 leading-tight"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              {statusLabel}
            </span>
          </>
        )}
      </div>
      {isExpanded && (
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-2 min-h-[100px]">
            {/* Quick add input */}
            {isAddingTask && (
              <div className="flex items-center gap-1 p-2 border rounded-lg bg-muted/30 animate-fade-in">
                <Input
                  autoFocus
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Título da tarefa..."
                  className="h-8 text-sm"
                  disabled={isSubmitting}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-primary"
                  onClick={handleQuickAdd}
                  disabled={!newTaskTitle.trim() || isSubmitting}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    setIsAddingTask(false);
                    setNewTaskTitle("");
                  }}
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            )}
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
      )}
    </div>
  );
}
