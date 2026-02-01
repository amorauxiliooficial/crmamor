import { useState, useEffect, useRef } from "react";
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
import { CalendarIcon, Trash2, Check, ImageIcon, Upload, X, ExternalLink, Loader2, Clipboard } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TarefaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefa?: TarefaInterna | null;
  defaultStatus?: TaskStatus;
  onSave: (data: {
    titulo: string;
    descricao?: string;
    status?: TaskStatus;
    prioridade?: TaskPriority;
    categoria?: TaskCategory;
    responsavel_id?: string;
    prazo?: string;
    imagem_url?: string | null;
  }, responsaveisIds?: string[]) => Promise<unknown>;
  onDelete?: () => Promise<boolean>;
  usuarios: { id: string; nome: string }[];
  responsaveisAtuais?: string[];
}

export function TarefaFormDialog({
  open,
  onOpenChange,
  tarefa,
  defaultStatus,
  onSave,
  onDelete,
  usuarios,
  responsaveisAtuais = [],
}: TarefaFormDialogProps) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [status, setStatus] = useState<TaskStatus>("backlog");
  const [prioridade, setPrioridade] = useState<TaskPriority>("media");
  const [categoria, setCategoria] = useState<TaskCategory>("melhoria");
  const [responsaveis, setResponsaveis] = useState<string[]>([]);
  const [prazo, setPrazo] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPasteFocused, setIsPasteFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pasteAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Reset form when dialog opens/closes or tarefa changes
  useEffect(() => {
    if (!open) return;
    
    if (tarefa) {
      setTitulo(tarefa.titulo);
      setDescricao(tarefa.descricao || "");
      setStatus(tarefa.status);
      setPrioridade(tarefa.prioridade);
      setCategoria(tarefa.categoria);
      setPrazo(tarefa.prazo ? parseISO(tarefa.prazo) : undefined);
      setImagemUrl(tarefa.imagem_url || null);
    } else {
      setTitulo("");
      setDescricao("");
      setStatus(defaultStatus || "backlog");
      setPrioridade("media");
      setCategoria("melhoria");
      setPrazo(undefined);
      setImagemUrl(null);
    }
  }, [tarefa, open, defaultStatus]);

  // Separate effect for responsaveis to avoid loop
  useEffect(() => {
    if (!open) return;
    setResponsaveis(responsaveisAtuais);
  }, [open, tarefa?.id]);

  const handleToggleResponsavel = (userId: string) => {
    setResponsaveis((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Arquivo muito grande",
        description: "O tamanho máximo é 5MB",
      });
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Tipo inválido",
        description: "Apenas imagens são permitidas",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("tarefas-imagens")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("tarefas-imagens")
        .getPublicUrl(fileName);

      setImagemUrl(publicUrl.publicUrl);
      toast({
        title: "Imagem enviada",
        description: "A imagem foi anexada à tarefa",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar",
        description: "Não foi possível enviar a imagem",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImagemUrl(null);
  };

  // Handle paste event within the paste area
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await handleImageUpload(file);
        }
        break;
      }
    }
  };

  const handleSave = async () => {
    if (!titulo.trim()) return;
    setSaving(true);
    await onSave(
      {
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        status,
        prioridade,
        categoria,
        prazo: prazo ? format(prazo, "yyyy-MM-dd") : undefined,
        imagem_url: imagemUrl,
      },
      responsaveis
    );
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
            <Label>Responsáveis</Label>
            <div className="flex flex-wrap gap-2 p-3 border rounded-md bg-muted/30 min-h-[44px]">
              {usuarios.map((u) => {
                const isSelected = responsaveis.includes(u.id);
                return (
                  <Badge
                    key={u.id}
                    variant={isSelected ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-all hover:opacity-80",
                      isSelected && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => handleToggleResponsavel(u.id)}
                  >
                    {isSelected && <Check className="h-3 w-3 mr-1" />}
                    {u.nome}
                  </Badge>
                );
              })}
              {usuarios.length === 0 && (
                <span className="text-sm text-muted-foreground">Nenhum usuário disponível</span>
              )}
            </div>
            {responsaveis.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {responsaveis.length} responsável(is) selecionado(s)
              </p>
            )}
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

          {/* Image upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              Imagem de referência
            </Label>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
            />
            
            {imagemUrl ? (
              <div className="relative group rounded-lg overflow-hidden border bg-muted/20">
                <img 
                  src={imagemUrl} 
                  alt="Preview" 
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(imagemUrl, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Abrir
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remover
                  </Button>
                </div>
              </div>
            ) : (
              <div
                ref={pasteAreaRef}
                tabIndex={0}
                onPaste={handlePaste}
                onFocus={() => setIsPasteFocused(true)}
                onBlur={() => setIsPasteFocused(false)}
                className={cn(
                  "relative rounded-lg border bg-muted/30 p-4 transition-all cursor-pointer",
                  "hover:bg-muted/50 hover:border-primary/30",
                  isPasteFocused && "border-primary bg-primary/5 ring-1 ring-primary/30",
                  uploading && "opacity-50 pointer-events-none"
                )}
                onClick={() => pasteAreaRef.current?.focus()}
              >
                {uploading ? (
                  <div className="flex items-center justify-center gap-3 py-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Enviando imagem...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <Clipboard className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Colar print (Ctrl+V)</p>
                      <p className="text-xs text-muted-foreground">ou clique para escolher arquivo</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
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
