import { MaeProcesso, StatusProcesso, STATUS_COLORS } from "@/types/mae";
import { KanbanCard } from "./KanbanCard";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Draggable } from "@hello-pangea/dnd";

interface KanbanColumnProps {
  status: StatusProcesso;
  maes: MaeProcesso[];
  onCardClick: (mae: MaeProcesso) => void;
  isDraggingOver?: boolean;
}

export function KanbanColumn({ status, maes, onCardClick, isDraggingOver }: KanbanColumnProps) {
  const statusLabel = status.split(" ").slice(1).join(" ") || status;
  const emoji = status.split(" ")[0];

  return (
    <div className={cn(
      "flex h-full w-[300px] flex-shrink-0 flex-col rounded-lg border bg-card transition-colors",
      isDraggingOver && "ring-2 ring-primary bg-primary/5"
    )}>
      <div
        className={cn(
          "flex items-center gap-2 border-b px-4 py-3",
          STATUS_COLORS[status]
        )}
      >
        <span className="text-lg">{emoji}</span>
        <h3 className="font-semibold text-sm">{statusLabel}</h3>
        <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-medium">
          {maes.length}
        </span>
      </div>
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2 min-h-[100px]">
          {maes.map((mae, index) => (
            <Draggable key={mae.id} draggableId={mae.id} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                >
                  <KanbanCard 
                    mae={mae} 
                    onClick={() => onCardClick(mae)} 
                    isDragging={snapshot.isDragging}
                  />
                </div>
              )}
            </Draggable>
          ))}
          {maes.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum processo
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
