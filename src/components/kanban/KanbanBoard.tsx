import { MaeProcesso, STATUS_ORDER, StatusProcesso } from "@/types/mae";
import { KanbanColumn } from "./KanbanColumn";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useMemo, useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";

const STORAGE_KEY = "kanban-expanded-columns";

interface KanbanBoardProps {
  maes: (MaeProcesso & { ultima_atividade_em?: string | null })[];
  onCardClick: (mae: MaeProcesso) => void;
  onStatusChange?: (maeId: string, newStatus: StatusProcesso) => void;
  onOpenAtividades?: (mae: MaeProcesso) => void;
  visibleStatuses?: StatusProcesso[];
  alertasNaoLidos?: Set<string>;
}

export function KanbanBoard({
  maes,
  onCardClick,
  onStatusChange,
  onOpenAtividades,
  visibleStatuses = STATUS_ORDER,
  alertasNaoLidos = new Set(),
}: KanbanBoardProps) {
  // Load expanded columns from localStorage or default to all expanded
  const [expandedColumns, setExpandedColumns] = useState<Set<StatusProcesso>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as StatusProcesso[];
        return new Set(parsed);
      }
    } catch {
      // Ignore parse errors
    }
    // Default: all columns expanded
    return new Set(STATUS_ORDER);
  });

  // Save to localStorage whenever expandedColumns changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(expandedColumns)));
    } catch {
      // Ignore storage errors
    }
  }, [expandedColumns]);

  const toggleColumn = useCallback((status: StatusProcesso) => {
    setExpandedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);

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
                    onOpenAtividades={onOpenAtividades}
                    isDraggingOver={snapshot.isDraggingOver}
                    isExpanded={expandedColumns.has(status)}
                    onToggleExpand={() => toggleColumn(status)}
                    alertasNaoLidos={alertasNaoLidos}
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
