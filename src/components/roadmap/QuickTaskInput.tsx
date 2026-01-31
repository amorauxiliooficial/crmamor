import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, Send, ChevronDown, ChevronUp } from "lucide-react";
import {
  TaskPriority,
  TaskCategory,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
  TASK_CATEGORY_LABELS,
  TASK_CATEGORY_COLORS,
} from "@/types/tarefaInterna";

interface QuickTaskInputProps {
  onCreateTask: (data: {
    titulo: string;
    prioridade: TaskPriority;
    categoria: TaskCategory;
  }) => Promise<unknown>;
}

const PRIORITIES: TaskPriority[] = ["baixa", "media", "alta", "urgente"];
const CATEGORIES: TaskCategory[] = ["bug", "melhoria", "nova_funcionalidade", "ajuste"];

export function QuickTaskInput({ onCreateTask }: QuickTaskInputProps) {
  const [titulo, setTitulo] = useState("");
  const [prioridade, setPrioridade] = useState<TaskPriority>("media");
  const [categoria, setCategoria] = useState<TaskCategory>("melhoria");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!titulo.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onCreateTask({
        titulo: titulo.trim(),
        prioridade,
        categoria,
      });
      setTitulo("");
      setPrioridade("media");
      setCategoria("melhoria");
      setIsExpanded(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-expand when user starts typing
  useEffect(() => {
    if (titulo.length > 0 && !isExpanded) {
      setIsExpanded(true);
    }
  }, [titulo, isExpanded]);

  return (
    <div className="bg-card border rounded-lg p-4 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Main input row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Adicionar nova tarefa rapidamente..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10 pr-4"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="submit"
            disabled={!titulo.trim() || isSubmitting}
            className="shrink-0"
          >
            <Send className="h-4 w-4 mr-2" />
            Criar
          </Button>
        </div>

        {/* Expandable options */}
        {isExpanded && (
          <div className="flex flex-col gap-3 pt-2 border-t animate-in slide-in-from-top-2 duration-200">
            {/* Priority selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Prioridade</label>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITIES.map((p) => (
                  <Badge
                    key={p}
                    variant="secondary"
                    className={cn(
                      "cursor-pointer transition-all text-xs px-2.5 py-1",
                      prioridade === p
                        ? cn(TASK_PRIORITY_COLORS[p], "ring-2 ring-primary ring-offset-1")
                        : "opacity-60 hover:opacity-100"
                    )}
                    onClick={() => setPrioridade(p)}
                  >
                    {TASK_PRIORITY_LABELS[p]}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Category selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Categoria</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <Badge
                    key={c}
                    variant="secondary"
                    className={cn(
                      "cursor-pointer transition-all text-xs px-2.5 py-1",
                      categoria === c
                        ? cn(TASK_CATEGORY_COLORS[c], "ring-2 ring-primary ring-offset-1")
                        : "opacity-60 hover:opacity-100"
                    )}
                    onClick={() => setCategoria(c)}
                  >
                    {TASK_CATEGORY_LABELS[c]}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
