import { useState } from "react";
import { TarefaInterna, TaskStatus, TaskPriority, TaskCategory, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from "@/types/tarefaInterna";
import { TarefaCard } from "./TarefaCard";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Draggable } from "@hello-pangea/dnd";
import { Plus, X, Check, FileText, Zap, ChevronDown, Bug, Sparkles, Wrench, Star, AlertTriangle, ArrowUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

interface TarefaColumnProps {
  status: TaskStatus;
  tarefas: TarefaInterna[];
  onCardClick: (tarefa: TarefaInterna) => void;
  isDraggingOver?: boolean;
  usuarios: Record<string, string>;
  responsaveisPorTarefa: Record<string, string[]>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onQuickAdd: (titulo: string, status: TaskStatus, extras?: { prioridade?: TaskPriority; categoria?: TaskCategory }) => Promise<unknown>;
  onOpenFullForm: (status: TaskStatus) => void;
}

export function TarefaColumn({
  status,
  tarefas,
  onCardClick,
  isDraggingOver,
  usuarios,
  responsaveisPorTarefa,
  isExpanded,
  onToggleExpand,
  onQuickAdd,
  onOpenFullForm,
}: TarefaColumnProps) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [quickPriority, setQuickPriority] = useState<TaskPriority>("media");
  const [quickCategory, setQuickCategory] = useState<TaskCategory>("melhoria");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const statusLabel = TASK_STATUS_LABELS[status].split(" ").slice(1).join(" ");
  const emoji = TASK_STATUS_LABELS[status].split(" ")[0];

  // Helper to get responsaveis with names for a tarefa
  const getResponsaveisComNomes = (tarefaId: string) => {
    const userIds = responsaveisPorTarefa[tarefaId] || [];
    return userIds.map((id) => ({ id, nome: usuarios[id] || "Desconhecido" }));
  };

  const handleQuickAdd = async (categoria?: TaskCategory, prioridade?: TaskPriority) => {
    if (!newTaskTitle.trim()) return;
    setIsSubmitting(true);
    await onQuickAdd(newTaskTitle.trim(), status, {
      categoria: categoria || quickCategory,
      prioridade: prioridade || quickPriority,
    });
    setNewTaskTitle("");
    setQuickPriority("media");
    setQuickCategory("melhoria");
    setIsAddingTask(false);
    setIsSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      handleQuickAdd();
    } else if (e.key === "Escape") {
      setIsAddingTask(false);
      setNewTaskTitle("");
      setQuickPriority("media");
      setQuickCategory("melhoria");
    }
  };

  const categoryOptions: { value: TaskCategory; label: string; icon: React.ReactNode }[] = [
    { value: "bug", label: "Bug", icon: <Bug className="h-3.5 w-3.5 text-red-500" /> },
    { value: "melhoria", label: "Melhoria", icon: <Sparkles className="h-3.5 w-3.5 text-blue-500" /> },
    { value: "nova_funcionalidade", label: "Nova Func.", icon: <Star className="h-3.5 w-3.5 text-yellow-500" /> },
    { value: "ajuste", label: "Ajuste", icon: <Wrench className="h-3.5 w-3.5 text-gray-500" /> },
  ];

  const priorityOptions: { value: TaskPriority; label: string; icon: React.ReactNode }[] = [
    { value: "urgente", label: "Urgente", icon: <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> },
    { value: "alta", label: "Alta", icon: <ArrowUp className="h-3.5 w-3.5 text-orange-500" /> },
    { value: "media", label: "Média", icon: <span className="h-3.5 w-3.5 text-yellow-500">—</span> },
    { value: "baixa", label: "Baixa", icon: <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> },
  ];

  return (
    <div
      className={cn(
        "flex h-full flex-shrink-0 flex-col rounded-lg border bg-card transition-all duration-300 animate-fade-in",
        isExpanded ? "w-[280px]" : "w-[48px] cursor-pointer",
        isDraggingOver && "ring-2 ring-primary bg-primary/5 scale-[1.02]"
      )}
      onClick={!isExpanded ? onToggleExpand : undefined}
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b px-4 py-3 cursor-pointer transition-colors duration-200",
          TASK_STATUS_COLORS[status],
          !isExpanded && "flex-col px-2 py-4"
        )}
        onClick={isExpanded ? onToggleExpand : undefined}
      >
        <span className="text-lg">{emoji}</span>
        {isExpanded ? (
          <>
            <h3 className="font-semibold text-sm flex-1">{statusLabel}</h3>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-medium">
              {tarefas.length}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                  title="Adicionar tarefa"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onOpenFullForm(status)}>
                  <FileText className="h-4 w-4 mr-2 text-blue-500" />
                  Formulário completo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Bug className="h-4 w-4 mr-2 text-red-500" />
                    Bug rápido
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {priorityOptions.map((p) => (
                      <DropdownMenuItem
                        key={p.value}
                        onClick={() => {
                          setQuickCategory("bug");
                          setQuickPriority(p.value);
                          setIsAddingTask(true);
                        }}
                      >
                        {p.icon}
                        <span className="ml-2">{p.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Sparkles className="h-4 w-4 mr-2 text-blue-500" />
                    Melhoria rápida
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {priorityOptions.map((p) => (
                      <DropdownMenuItem
                        key={p.value}
                        onClick={() => {
                          setQuickCategory("melhoria");
                          setQuickPriority(p.value);
                          setIsAddingTask(true);
                        }}
                      >
                        {p.icon}
                        <span className="ml-2">{p.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background text-[10px] font-medium">
              {tarefas.length}
            </span>
            <span
              className="text-[10px] font-medium text-center mt-2 leading-tight"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              {statusLabel}
            </span>
          </>
        )}
      </div>
      {isExpanded && (
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-2 min-h-[100px]">
            {/* Quick add input */}
            {isAddingTask && (
              <div className="p-2 border rounded-lg bg-muted/30 animate-fade-in space-y-2">
                <Input
                  autoFocus
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Título da tarefa... (Enter para criar)"
                  className="h-8 text-sm"
                  disabled={isSubmitting}
                />
                <div className="flex items-center gap-1 flex-wrap">
                  {/* Category badges */}
                  {categoryOptions.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setQuickCategory(cat.value)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all",
                        quickCategory === cat.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      {cat.icon}
                      {cat.label}
                    </button>
                  ))}
                  <span className="text-muted-foreground mx-1">|</span>
                  {/* Priority badges */}
                  {priorityOptions.map((pri) => (
                    <button
                      key={pri.value}
                      onClick={() => setQuickPriority(pri.value)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all",
                        quickPriority === pri.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      {pri.icon}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs flex-1"
                    onClick={() => handleQuickAdd()}
                    disabled={!newTaskTitle.trim() || isSubmitting}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Criar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => onOpenFullForm(status)}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1" />
                    Completo
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => {
                      setIsAddingTask(false);
                      setNewTaskTitle("");
                      setQuickPriority("media");
                      setQuickCategory("melhoria");
                    }}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            )}
            {tarefas.map((tarefa, index) => (
              <Draggable key={tarefa.id} draggableId={tarefa.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <TarefaCard
                      tarefa={tarefa}
                      onClick={() => onCardClick(tarefa)}
                      isDragging={snapshot.isDragging}
                      responsaveis={getResponsaveisComNomes(tarefa.id)}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {tarefas.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma tarefa
              </p>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
