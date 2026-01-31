import { useMemo, useState, useCallback } from "react";
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
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";

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
  const [currentColumnIndex, setCurrentColumnIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);

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

  // Filter to only statuses with items for swipe navigation
  const activeStatuses = useMemo(() => {
    return visibleStatuses.filter((status) => (groupedMaes[status]?.length || 0) > 0);
  }, [visibleStatuses, groupedMaes]);

  const navigateColumn = useCallback((direction: "left" | "right") => {
    if (isTransitioning || activeStatuses.length === 0) return;

    setSlideDirection(direction);
    setIsTransitioning(true);

    setTimeout(() => {
      setCurrentColumnIndex((prev) => {
        if (direction === "right") {
          return prev > 0 ? prev - 1 : activeStatuses.length - 1;
        }
        return prev < activeStatuses.length - 1 ? prev + 1 : 0;
      });
      setSlideDirection(null);
      setIsTransitioning(false);
    }, 200);
  }, [isTransitioning, activeStatuses.length]);

  const swipeHandlers = useSwipeNavigation({
    threshold: 50,
    onSwipeLeft: () => navigateColumn("left"),
    onSwipeRight: () => navigateColumn("right"),
  });

  // Clamp index if statuses change
  const safeColumnIndex = Math.min(currentColumnIndex, Math.max(0, activeStatuses.length - 1));
  const currentStatus = activeStatuses[safeColumnIndex];
  const currentMaes = currentStatus ? groupedMaes[currentStatus] || [] : [];

  const getSlideTransform = () => {
    if (!slideDirection) return "translate-x-0 opacity-100";
    if (slideDirection === "left") return "-translate-x-full opacity-0";
    return "translate-x-full opacity-0";
  };

  if (activeStatuses.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Nenhum processo encontrado
      </div>
    );
  }

  // Show swipe mode if there are multiple columns with items
  if (activeStatuses.length > 1) {
    const statusLabel = currentStatus?.split(" ").slice(1).join(" ") || currentStatus;
    const emoji = currentStatus?.split(" ")[0];

    return (
      <div 
        className="relative overflow-hidden"
        {...swipeHandlers}
      >
        {/* Column Navigation Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-background sticky top-0 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigateColumn("right")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-lg">{emoji}</span>
            <span className="font-semibold text-sm">{statusLabel}</span>
            <Badge variant="secondary" className="text-xs h-5 px-1.5">
              {currentMaes.length}
            </Badge>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigateColumn("left")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Column Indicators */}
        <div className="flex justify-center gap-1.5 py-2 border-b">
          {activeStatuses.map((status, index) => (
            <button
              key={status}
              onClick={() => {
                if (index !== safeColumnIndex) {
                  setSlideDirection(index > safeColumnIndex ? "left" : "right");
                  setIsTransitioning(true);
                  setTimeout(() => {
                    setCurrentColumnIndex(index);
                    setSlideDirection(null);
                    setIsTransitioning(false);
                  }, 200);
                }
              }}
              className={cn(
                "h-2 rounded-full transition-all",
                index === safeColumnIndex 
                  ? "w-6 bg-primary" 
                  : "w-2 bg-muted-foreground/30"
              )}
            />
          ))}
        </div>

        {/* Cards with Slide Animation */}
        <div
          className={cn(
            "transition-all duration-200 ease-out px-2 py-3",
            getSlideTransform()
          )}
        >
          {currentMaes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum processo
            </p>
          ) : (
            <div className="space-y-2">
              {currentMaes.map((mae) => (
                <KanbanCard
                  key={mae.id}
                  mae={mae}
                  onClick={() => onCardClick(mae)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Swipe Hint */}
        <p className="text-center text-xs text-muted-foreground py-2">
          ← Deslize para navegar →
        </p>
      </div>
    );
  }

  // Fallback to accordion for single status
  return (
    <Accordion type="multiple" defaultValue={[currentStatus]} className="space-y-2 px-1 py-2">
      {visibleStatuses.map((status) => {
        const statusLabel = status.split(" ").slice(1).join(" ") || status;
        const emoji = status.split(" ")[0];
        const count = groupedMaes[status]?.length || 0;

        return (
          <AccordionItem
            key={status}
            value={status}
            className={cn(
              "border rounded-xl overflow-hidden shadow-sm",
              STATUS_COLORS[status]
            )}
          >
            <AccordionTrigger className="px-3 py-2.5 hover:no-underline active:bg-muted/50">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-base shrink-0">{emoji}</span>
                <span className="font-semibold text-sm truncate">{statusLabel}</span>
                <Badge variant="secondary" className="ml-auto mr-2 text-xs h-5 px-1.5">
                  {count}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-2">
              {count === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
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
