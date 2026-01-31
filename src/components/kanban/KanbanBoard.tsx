import { MaeProcesso, STATUS_ORDER, StatusProcesso } from "@/types/mae";
import { KanbanColumn } from "./KanbanColumn";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useMemo, useEffect, useState } from "react";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import { TipoAtividade } from "@/types/atividade";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface KanbanBoardProps {
  maes: (MaeProcesso & { ultima_atividade_em?: string | null })[];
  onCardClick: (mae: MaeProcesso) => void;
  onStatusChange?: (maeId: string, newStatus: StatusProcesso) => void;
  onOpenAtividades?: (mae: MaeProcesso) => void;
  onQuickActivity?: (mae: MaeProcesso, tipo: TipoAtividade) => void;
  visibleStatuses?: StatusProcesso[];
}

export function KanbanBoard({
  maes,
  onCardClick,
  onStatusChange,
  onOpenAtividades,
  onQuickActivity,
  visibleStatuses = STATUS_ORDER,
}: KanbanBoardProps) {
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});

  // Fetch all user profiles for display
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email");
      
      if (data) {
        const profileMap: Record<string, UserProfile> = {};
        data.forEach((p) => {
          profileMap[p.id] = p;
        });
        setUserProfiles(profileMap);
      }
    };
    fetchProfiles();
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
                    onQuickActivity={onQuickActivity}
                    isDraggingOver={snapshot.isDraggingOver}
                    userProfiles={userProfiles}
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
