import { useEffect } from "react";
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

const formSchema = z.object({
  pergunta: z.string().min(1, "Pergunta obrigatória"),
  resposta: z.string().min(1, "Resposta obrigatória"),
  categoria_id: z.string().optional(),
  tags: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PlaybookEntradaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorias: PlaybookCategoria[];
  entrada?: PlaybookEntrada | null;
  onSave: (data: { pergunta: string; resposta: string; categoria_id?: string; tags?: string[] }) => void;
}

export function PlaybookEntradaDialog({
  open,
  onOpenChange,
  categorias,
  entrada,
  onSave,
}: PlaybookEntradaDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pergunta: "",
      resposta: "",
      categoria_id: "",
      tags: "",
    },
  });

  useEffect(() => {
    if (entrada) {
      form.reset({
        pergunta: entrada.pergunta,
        resposta: entrada.resposta,
        categoria_id: entrada.categoria_id || "",
        tags: entrada.tags?.join(", ") || "",
      });
    } else {
      form.reset({
        pergunta: "",
        resposta: "",
        categoria_id: "",
        tags: "",
      });
    }
  }, [entrada, form]);

  const handleSubmit = (values: FormValues) => {
    const tags = values.tags
      ? values.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;
    onSave({
      pergunta: values.pergunta,
      resposta: values.resposta,
      categoria_id: values.categoria_id || undefined,
      tags,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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
            <FormField
              control={form.control}
              name="resposta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resposta Sugerida</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Escreva a resposta ideal para esta pergunta..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
