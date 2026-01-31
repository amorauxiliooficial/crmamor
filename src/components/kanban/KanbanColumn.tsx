import { useState } from "react";
import { MaeProcesso, StatusProcesso, STATUS_COLORS } from "@/types/mae";
import { KanbanCard } from "./KanbanCard";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Draggable } from "@hello-pangea/dnd";
import { ChevronDown, ChevronRight } from "lucide-react";

interface KanbanColumnProps {
  status: StatusProcesso;
  maes: (MaeProcesso & { ultima_atividade_em?: string | null })[];
  onCardClick: (mae: MaeProcesso) => void;
  onOpenAtividades?: (mae: MaeProcesso) => void;
  isDraggingOver?: boolean;
  defaultExpanded?: boolean;
}

export function KanbanColumn({ 
  status, 
  maes, 
  onCardClick, 
  onOpenAtividades, 
  isDraggingOver,
  defaultExpanded = true
}: KanbanColumnProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const statusLabel = status.split(" ").slice(1).join(" ") || status;
  const emoji = status.split(" ")[0];

  return (
    <div className={cn(
      "flex flex-shrink-0 flex-col rounded-lg border bg-card transition-all duration-300",
      isExpanded ? "w-[300px] h-full" : "w-[52px] h-full",
      isDraggingOver && "ring-2 ring-primary bg-primary/5"
    )}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2 border-b px-3 py-3 w-full text-left transition-colors hover:bg-accent/50",
          STATUS_COLORS[status],
          !isExpanded && "flex-col py-4 px-2"
        )}
      >
        {isExpanded ? (
          <>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-lg">{emoji}</span>
            <h3 className="font-semibold text-sm truncate flex-1">{statusLabel}</h3>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-medium">
              {maes.length}
            </span>
          </>
        ) : (
          <>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-lg">{emoji}</span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background text-[10px] font-medium">
              {maes.length}
            </span>
            <span 
              className="font-semibold text-[10px] writing-mode-vertical max-h-[120px] overflow-hidden text-ellipsis"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              {statusLabel}
            </span>
          </>
        )}
      </button>
      
      {isExpanded && (
        <ScrollArea className="flex-1 p-2 animate-fade-in">
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
