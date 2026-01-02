import { useEffect, useState } from "react";
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pergunta: "",
      categoria_id: "",
      tags: "",
    },
  });

  useEffect(() => {
    if (entrada) {
      form.reset({
        pergunta: entrada.pergunta,
        categoria_id: entrada.categoria_id || "",
        tags: entrada.tags?.join(", ") || "",
      });
      setRespostas(entrada.respostas?.length ? entrada.respostas : [""]);
    } else {
      form.reset({
        pergunta: "",
        categoria_id: "",
        tags: "",
      });
      setRespostas([""]);
    }
  }, [entrada, form, open]);

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
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Respostas Sugeridas</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddResposta}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              {respostas.map((resposta, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <Textarea
                      placeholder={`Resposta ${index + 1}...`}
                      className="min-h-[80px]"
                      value={resposta}
                      onChange={(e) => handleRespostaChange(index, e.target.value)}
                    />
                  </div>
                  {respostas.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveResposta(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
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
