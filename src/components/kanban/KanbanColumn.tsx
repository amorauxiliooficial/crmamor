import { MaeProcesso, StatusProcesso, STATUS_COLORS } from "@/types/mae";
import { KanbanCard } from "./KanbanCard";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Draggable } from "@hello-pangea/dnd";

interface KanbanColumnProps {
  status: StatusProcesso;
  maes: (MaeProcesso & { ultima_atividade_em?: string | null })[];
  onCardClick: (mae: MaeProcesso) => void;
  onOpenAtividades?: (mae: MaeProcesso) => void;
  isDraggingOver?: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export function KanbanColumn({ 
  status, 
  maes, 
  onCardClick, 
  onOpenAtividades, 
  isDraggingOver,
  isExpanded,
  onToggleExpand,
}: KanbanColumnProps) {
  const statusLabel = status.split(" ").slice(1).join(" ") || status;
  const emoji = status.split(" ")[0];

  return (
    <div 
      className={cn(
        "flex h-full flex-shrink-0 flex-col rounded-lg border bg-card transition-all duration-200 cursor-pointer",
        isExpanded ? "w-[300px]" : "w-[48px]",
        isDraggingOver && "ring-2 ring-primary bg-primary/5"
      )}
      onClick={() => !isExpanded && onToggleExpand()}
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b px-4 py-3",
          STATUS_COLORS[status],
          !isExpanded && "flex-col px-2 py-4"
        )}
        onClick={(e) => {
          if (isExpanded) {
            e.stopPropagation();
            onToggleExpand();
          }
        }}
      >
        <span className="text-lg">{emoji}</span>
        {isExpanded ? (
          <>
            <h3 className="font-semibold text-sm">{statusLabel}</h3>
            <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-medium">
              {maes.length}
            </span>
          </>
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background text-[10px] font-medium">
            {maes.length}
          </span>
        )}
      </div>
      {isExpanded && (
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
                      onOpenAtividades={() => onOpenAtividades?.(mae)}
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
      )}
    </div>
  );
}
