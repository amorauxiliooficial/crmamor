import { MaeProcesso, STATUS_ORDER, StatusProcesso } from "@/types/mae";
import { KanbanColumn } from "./KanbanColumn";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useMemo } from "react";

interface KanbanBoardProps {
  maes: MaeProcesso[];
  onCardClick: (mae: MaeProcesso) => void;
  visibleStatuses?: StatusProcesso[];
}

export function KanbanBoard({
  maes,
  onCardClick,
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

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 p-4">
        {visibleStatuses.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            maes={groupedMaes[status] || []}
            onCardClick={onCardClick}
          />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
