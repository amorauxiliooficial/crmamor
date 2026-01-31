import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  TarefaInterna,
  TaskStatus,
  TaskPriority,
  TaskCategory,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_CATEGORY_LABELS,
  TASK_STATUS_ORDER,
} from "@/types/tarefaInterna";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TarefaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefa?: TarefaInterna | null;
  onSave: (data: {
    titulo: string;
    descricao?: string;
    status?: TaskStatus;
    prioridade?: TaskPriority;
    categoria?: TaskCategory;
    responsavel_id?: string;
    prazo?: string;
  }) => Promise<unknown>;
  onDelete?: () => Promise<boolean>;
  usuarios: { id: string; nome: string }[];
}

export function TarefaFormDialog({
  open,
  onOpenChange,
  tarefa,
  onSave,
  onDelete,
  usuarios,
}: TarefaFormDialogProps) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<TaskStatus>("backlog");
  const [prioridade, setPrioridade] = useState<TaskPriority>("media");
  const [categoria, setCategoria] = useState<TaskCategory>("melhoria");
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [prazo, setPrazo] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tarefa) {
      setTitulo(tarefa.titulo);
      setDescricao(tarefa.descricao || "");
      setStatus(tarefa.status);
      setPrioridade(tarefa.prioridade);
      setCategoria(tarefa.categoria);
      setResponsavelId(tarefa.responsavel_id || "");
      setPrazo(tarefa.prazo ? parseISO(tarefa.prazo) : undefined);
    } else {
      setTitulo("");
      setDescricao("");
      setStatus("backlog");
      setPrioridade("media");
      setCategoria("melhoria");
      setResponsavelId("");
      setPrazo(undefined);
    }
  }, [tarefa, open]);

  const handleSave = async () => {
    if (!titulo.trim()) return;
    setSaving(true);
    await onSave({
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      status,
      prioridade,
      categoria,
      responsavel_id: responsavelId || undefined,
      prazo: prazo ? format(prazo, "yyyy-MM-dd") : undefined,
    });
    setSaving(false);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (onDelete) {
      await onDelete();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{tarefa ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Implementar filtro por data"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes da tarefa..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {TASK_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {TASK_PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as TaskCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TASK_CATEGORY_LABELS) as TaskCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {TASK_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select 
                value={responsavelId || "__none__"} 
                onValueChange={(v) => setResponsavelId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Ninguém</SelectItem>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Prazo</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !prazo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {prazo ? format(prazo, "PPP", { locale: ptBR }) : "Sem prazo definido"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={prazo}
                  onSelect={setPrazo}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          {tarefa && onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. A tarefa será permanentemente removida.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!titulo.trim() || saving}>
              {saving ? "Salvando..." : tarefa ? "Salvar" : "Criar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
