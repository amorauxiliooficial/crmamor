import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlaybookCategoria, PlaybookEntrada } from "@/types/playbook";
import { Plus, Trash2 } from "lucide-react";

const formSchema = z.object({
  pergunta: z.string().min(1, "Pergunta obrigatória"),
  categoria_id: z.string().optional(),
  tags: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const DRAFT_STORAGE_KEY = "playbook_nova_entrada_draft_v1";

type PlaybookEntradaDraft = {
  pergunta: string;
  categoria_id?: string;
  tags?: string;
  respostas: string[];
};

interface PlaybookEntradaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorias: PlaybookCategoria[];
  entrada?: PlaybookEntrada | null;
  onSave: (data: { pergunta: string; respostas: string[]; categoria_id?: string; tags?: string[] }) => void;
}

export function PlaybookEntradaDialog({
  open,
  onOpenChange,
  categorias,
  entrada,
  onSave,
}: PlaybookEntradaDialogProps) {
  const [respostas, setRespostas] = useState<string[]>([""]);
  const skipNextDraftSaveRef = useRef(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pergunta: "",
      categoria_id: "",
      tags: "",
    },
  });

  const watchedPergunta = form.watch("pergunta");
  const watchedCategoriaId = form.watch("categoria_id");
  const watchedTags = form.watch("tags");

  useEffect(() => {
    if (!open) return;

    if (entrada) {
      form.reset({
        pergunta: entrada.pergunta,
        categoria_id: entrada.categoria_id || "",
        tags: entrada.tags?.join(", ") || "",
      });
      setRespostas(entrada.respostas?.length ? entrada.respostas : [""]);
      return;
    }

    // Nova entrada: tenta restaurar rascunho salvo
    skipNextDraftSaveRef.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PlaybookEntradaDraft>;
        form.reset({
          pergunta: typeof parsed.pergunta === "string" ? parsed.pergunta : "",
          categoria_id: typeof parsed.categoria_id === "string" ? parsed.categoria_id : "",
          tags: typeof parsed.tags === "string" ? parsed.tags : "",
        });
        setRespostas(Array.isArray(parsed.respostas) && parsed.respostas.length ? parsed.respostas : [""]);
        return;
      }
    } catch {
      // ignore
    }

    form.reset({
      pergunta: "",
      categoria_id: "",
      tags: "",
    });
    setRespostas([""]);
  }, [entrada, form, open]);

  useEffect(() => {
    if (!open || entrada) return;

    // evita sobrescrever o rascunho logo após hidratar/resetar
    if (skipNextDraftSaveRef.current) {
      skipNextDraftSaveRef.current = false;
      return;
    }

    const draft: PlaybookEntradaDraft = {
      pergunta: watchedPergunta || "",
      categoria_id: watchedCategoriaId || "",
      tags: watchedTags || "",
      respostas,
    };

    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [open, entrada, watchedPergunta, watchedCategoriaId, watchedTags, respostas]);

  const handleAddResposta = () => {
    setRespostas([...respostas, ""]);
  };

  const handleRemoveResposta = (index: number) => {
    if (respostas.length > 1) {
      setRespostas(respostas.filter((_, i) => i !== index));
    }
  };

  const handleRespostaChange = (index: number, value: string) => {
    const newRespostas = [...respostas];
    newRespostas[index] = value;
    setRespostas(newRespostas);
  };

  const handleSubmit = (values: FormValues) => {
    const validRespostas = respostas.filter((r) => r.trim() !== "");
    if (validRespostas.length === 0) {
      return;
    }
    const tags = values.tags
      ? values.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;

    // Ao salvar de fato, limpa o rascunho
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }

    onSave({
      pergunta: values.pergunta,
      respostas: validRespostas,
      categoria_id: values.categoria_id || undefined,
      tags,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {entrada ? "Editar Entrada" : "Nova Entrada"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="categoria_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pergunta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pergunta / Objeção</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Quanto custa o serviço?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Respostas Sugeridas</FormLabel>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleAddResposta}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Resposta
                </Button>
              </div>
              
              {respostas.map((resposta, index) => (
                <div key={index} className="space-y-2 p-3 border border-border rounded-lg bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">
                      Resposta {index + 1}
                    </span>
                    {respostas.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveResposta(index)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remover
                      </Button>
                    )}
                  </div>
                  <Textarea
                    placeholder={`Digite a resposta ${index + 1}...`}
                    className="min-h-[100px] bg-background"
                    value={resposta}
                    onChange={(e) => handleRespostaChange(index, e.target.value)}
                  />
                </div>
              ))}
              
              {respostas.every((r) => r.trim() === "") && (
                <p className="text-sm text-destructive">Pelo menos uma resposta é obrigatória</p>
              )}
            </div>

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (separadas por vírgula)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: preço, valores, custo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={respostas.every((r) => r.trim() === "")}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
