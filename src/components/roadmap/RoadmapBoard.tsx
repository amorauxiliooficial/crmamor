import { useMemo, useState, useEffect, useCallback } from "react";
import { TarefaInterna, TaskStatus, TASK_STATUS_ORDER } from "@/types/tarefaInterna";
import { TarefaColumn } from "./TarefaColumn";
import { TarefaFormDialog } from "./TarefaFormDialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { supabase } from "@/integrations/supabase/client";
import { useTarefaResponsaveis } from "@/hooks/useTarefaResponsaveis";

const STORAGE_KEY = "roadmap-columns-expanded";

interface RoadmapBoardProps {
  tarefas: TarefaInterna[];
  onStatusChange: (id: string, newStatus: TaskStatus) => Promise<boolean>;
  onUpdate: (id: string, updates: Partial<TarefaInterna>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onCreateTarefa: (tarefa: { titulo: string; status?: TaskStatus }) => Promise<unknown>;
}

export function RoadmapBoard({
  tarefas,
  onStatusChange,
  onUpdate,
  onDelete,
  onCreateTarefa,
}: RoadmapBoardProps) {
  const [selectedTarefa, setSelectedTarefa] = useState<TarefaInterna | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [usuarios, setUsuarios] = useState<Record<string, string>>({});
  const { responsaveis, updateResponsaveis, getResponsaveisForTarefa } = useTarefaResponsaveis();

  // Column expansion state with localStorage persistence
  const [expandedColumns, setExpandedColumns] = useState<Record<TaskStatus, boolean>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return Object.fromEntries(TASK_STATUS_ORDER.map((s) => [s, true]));
      }
    }
    return Object.fromEntries(TASK_STATUS_ORDER.map((s) => [s, true]));
  });

  // Save expanded state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedColumns));
  }, [expandedColumns]);

  const toggleColumnExpand = useCallback((status: TaskStatus) => {
    setExpandedColumns((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  }, []);

  // Fetch users for display
  useEffect(() => {
    const fetchUsuarios = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email");
      
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((u) => {
          map[u.id] = u.full_name || u.email?.split("@")[0] || "Sem nome";
        });
        setUsuarios(map);
      }
    };
    fetchUsuarios();
  }, []);

  const groupedTarefas = useMemo(() => {
    const groups: Record<TaskStatus, TarefaInterna[]> = {
      backlog: [],
      priorizado: [],
      em_progresso: [],
      concluido: [],
    };

    tarefas.forEach((tarefa) => {
      if (groups[tarefa.status]) {
        groups[tarefa.status].push(tarefa);
      }
    });

    return groups;
  }, [tarefas]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceStatus = result.source.droppableId as TaskStatus;
    const destinationStatus = result.destination.droppableId as TaskStatus;

    if (sourceStatus === destinationStatus) return;

    const tarefaId = result.draggableId;
    onStatusChange(tarefaId, destinationStatus);
  };

  const handleCardClick = (tarefa: TarefaInterna) => {
    setSelectedTarefa(tarefa);
    setDialogOpen(true);
  };

  const handleSave = async (data: Parameters<typeof onUpdate>[1], responsaveisIds?: string[]) => {
    if (selectedTarefa) {
      await onUpdate(selectedTarefa.id, data);
      
      // Update responsáveis if provided
      if (responsaveisIds !== undefined) {
        await updateResponsaveis(selectedTarefa.id, responsaveisIds);
      }
    }
    return true;
  };

  const handleDelete = async () => {
    if (selectedTarefa) {
      return await onDelete(selectedTarefa.id);
    }
    return false;
  };

  const handleQuickAdd = async (titulo: string, status: TaskStatus) => {
    return await onCreateTarefa({ titulo, status });
  };

  const usuariosList = Object.entries(usuarios).map(([id, nome]) => ({ id, nome }));

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <ScrollArea className="w-full">
          <div className="flex gap-4 p-4">
            {TASK_STATUS_ORDER.map((status) => (
              <Droppable key={status} droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    <TarefaColumn
                      status={status}
                      tarefas={groupedTarefas[status] || []}
                      onCardClick={handleCardClick}
                      isDraggingOver={snapshot.isDraggingOver}
                      usuarios={usuarios}
                      responsaveisPorTarefa={responsaveis}
                      isExpanded={expandedColumns[status]}
                      onToggleExpand={() => toggleColumnExpand(status)}
                      onQuickAdd={handleQuickAdd}
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

      <TarefaFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tarefa={selectedTarefa}
        onSave={handleSave}
        onDelete={handleDelete}
        usuarios={usuariosList}
        responsaveisAtuais={selectedTarefa ? getResponsaveisForTarefa(selectedTarefa.id) : []}
      />
    </>
  );
}
