import { useMemo, useState } from "react";
import { MaeProcesso, STATUS_ORDER, StatusProcesso, STATUS_COLORS } from "@/types/mae";
import { KanbanCard } from "./KanbanCard";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown } from "lucide-react";

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
  const [expandedColumn, setExpandedColumn] = useState<StatusProcesso | null>(null);

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

  const handleColumnClick = (status: StatusProcesso) => {
    setExpandedColumn(expandedColumn === status ? null : status);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Horizontal columns bar */}
      <div className="flex overflow-x-auto gap-1.5 p-2 border-b bg-muted/30">
        {visibleStatuses.map((status) => {
          const statusLabel = status.split(" ").slice(1).join(" ") || status;
          const emoji = status.split(" ")[0];
          const count = groupedMaes[status]?.length || 0;
          const isExpanded = expandedColumn === status;

          return (
            <button
              key={status}
              onClick={() => handleColumnClick(status)}
              className={cn(
                "flex-shrink-0 flex items-center gap-1.5 px-2.5 py-2 rounded-lg border transition-all",
                "min-w-[70px] text-left",
                isExpanded
                  ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                  : "bg-card hover:bg-accent border-border",
                STATUS_COLORS[status]
              )}
            >
              <span className="text-sm">{emoji}</span>
              <Badge 
                variant={isExpanded ? "secondary" : "outline"} 
                className={cn(
                  "h-5 px-1.5 text-[10px] font-bold",
                  isExpanded && "bg-primary-foreground/20 text-primary-foreground border-0"
                )}
              >
                {count}
              </Badge>
              <ChevronDown 
                className={cn(
                  "h-3 w-3 transition-transform ml-auto",
                  isExpanded && "rotate-180"
                )} 
              />
            </button>
          );
        })}
      </div>

      {/* Expanded column content */}
      {expandedColumn ? (
        <div className="flex-1 overflow-hidden animate-fade-in">
          <div className={cn(
            "px-3 py-2 border-b flex items-center gap-2",
            STATUS_COLORS[expandedColumn]
          )}>
            <span className="text-lg">{expandedColumn.split(" ")[0]}</span>
            <h3 className="font-semibold text-sm">
              {expandedColumn.split(" ").slice(1).join(" ")}
            </h3>
            <Badge variant="secondary" className="ml-auto">
              {groupedMaes[expandedColumn]?.length || 0} processos
            </Badge>
          </div>
          
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="p-2 space-y-2">
              {(groupedMaes[expandedColumn]?.length || 0) === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum processo nesta coluna
                </p>
              ) : (
                groupedMaes[expandedColumn].map((mae) => (
                  <KanbanCard
                    key={mae.id}
                    mae={mae}
                    onClick={() => onCardClick(mae)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground p-6">
          <p className="text-center text-sm">
            Toque em uma coluna acima para ver os processos
          </p>
        </div>
      )}
    </div>
  );
}
