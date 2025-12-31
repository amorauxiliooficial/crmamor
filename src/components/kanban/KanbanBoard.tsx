import { MaeProcesso, STATUS_ORDER, StatusProcesso } from "@/types/mae";
import { KanbanColumn } from "./KanbanColumn";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useMemo } from "react";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";

interface KanbanBoardProps {
  maes: MaeProcesso[];
  onCardClick: (mae: MaeProcesso) => void;
  onStatusChange?: (maeId: string, newStatus: StatusProcesso) => void;
  visibleStatuses?: StatusProcesso[];
}

export function KanbanBoard({
  maes,
  onCardClick,
  onStatusChange,
  visibleStatuses = STATUS_ORDER,
}: KanbanBoardProps) {
  const groupedMaes = useMemo(() => {
    const groups: Record<StatusProcesso, MaeProcesso[]> = {} as any;
    
    STATUS_ORDER.forEach((status) => {
      groups[status] = [];
    });

    maes.forEach((mae) => {
      if (groups[mae.status_processo]) {
        groups[mae.status_processo].push(mae);
      }
    });

    return groups;
  }, [maes]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !onStatusChange) return;
    
    const sourceStatus = result.source.droppableId as StatusProcesso;
    const destinationStatus = result.destination.droppableId as StatusProcesso;
    
    if (sourceStatus === destinationStatus) return;
    
    const maeId = result.draggableId;
    onStatusChange(maeId, destinationStatus);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <ScrollArea className="w-full">
        <div className="flex gap-4 p-4">
          {visibleStatuses.map((status) => (
            <Droppable key={status} droppableId={status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <KanbanColumn
                    status={status}
                    maes={groupedMaes[status] || []}
                    onCardClick={onCardClick}
                    isDraggingOver={snapshot.isDraggingOver}
                  />
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </DragDropContext>
  );
}
