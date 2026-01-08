import { useMemo, useState } from "react";
import { MaeProcesso, STATUS_ORDER, StatusProcesso, STATUS_COLORS } from "@/types/mae";
import { KanbanCard } from "./KanbanCard";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface KanbanMobileListProps {
  maes: MaeProcesso[];
  onCardClick: (mae: MaeProcesso) => void;
  visibleStatuses?: StatusProcesso[];
}

export function KanbanMobileList({
  maes,
  onCardClick,
  visibleStatuses = STATUS_ORDER,
}: KanbanMobileListProps) {
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

  // Open the first status with items by default
  const defaultOpen = useMemo(() => {
    for (const status of visibleStatuses) {
      if (groupedMaes[status]?.length > 0) {
        return [status];
      }
    }
    return [];
  }, [groupedMaes, visibleStatuses]);

  return (
    <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-2 p-2">
      {visibleStatuses.map((status) => {
        const statusLabel = status.split(" ").slice(1).join(" ") || status;
        const emoji = status.split(" ")[0];
        const count = groupedMaes[status]?.length || 0;

        return (
          <AccordionItem
            key={status}
            value={status}
            className={cn(
              "border rounded-lg overflow-hidden",
              STATUS_COLORS[status]
            )}
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-lg">{emoji}</span>
                <span className="font-semibold text-sm">{statusLabel}</span>
                <Badge variant="secondary" className="ml-auto mr-2">
                  {count}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-2">
              {count === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhum processo
                </p>
              ) : (
                <div className="space-y-2">
                  {groupedMaes[status].map((mae) => (
                    <KanbanCard
                      key={mae.id}
                      mae={mae}
                      onClick={() => onCardClick(mae)}
                    />
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
