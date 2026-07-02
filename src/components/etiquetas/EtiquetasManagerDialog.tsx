import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEtiquetas, useCreateEtiqueta, useDeleteEtiqueta } from "@/hooks/useEtiquetas";

interface EtiquetasManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_COLORS = [
  "#ec4899", "#a855f7", "#3b82f6", "#22c55e",
  "#f59e0b", "#ef4444", "#14b8a6", "#64748b",
];

export function EtiquetasManagerDialog({ open, onOpenChange }: EtiquetasManagerDialogProps) {
  const { toast } = useToast();
  const { data: etiquetas = [], isLoading } = useEtiquetas();
  const createMut = useCreateEtiqueta();
  const deleteMut = useDeleteEtiqueta();
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(DEFAULT_COLORS[0]);

  const handleCreate = async () => {
    if (!nome.trim()) return;
    try {
      await createMut.mutateAsync({ nome: nome.trim().toLowerCase(), cor });
      setNome("");
      toast({ title: "Etiqueta criada" });
    } catch (e: any) {
      toast({
        title: "Erro ao criar etiqueta",
        description: e?.message?.includes("duplicate") ? "Já existe uma etiqueta com esse nome." : (e?.message ?? "Tente novamente"),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta etiqueta?")) return;
    try {
      await deleteMut.mutateAsync(id);
      toast({ title: "Etiqueta removida" });
    } catch (e: any) {
      toast({ title: "Erro ao remover", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            Gerenciar Etiquetas
          </DialogTitle>
          <DialogDescription>
            Cadastre as etiquetas usadas para classificar as mães (ex: marketing, instagram, indicação).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2 rounded-md border p-3">
            <Label>Nova etiqueta</Label>
            <div className="flex gap-2">
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="nome da etiqueta"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <Button onClick={handleCreate} disabled={createMut.isPending || !nome.trim()}>
                {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className={`h-6 w-6 rounded-full border-2 transition-transform ${cor === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ background: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Etiquetas cadastradas</Label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…
              </div>
            ) : etiquetas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma etiqueta cadastrada ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {etiquetas.map((et) => (
                  <div
                    key={et.id}
                    className="group flex items-center gap-1.5 rounded-full border pl-2 pr-1 py-0.5 text-xs"
                    style={{ borderColor: et.cor ?? undefined }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: et.cor ?? "hsl(var(--muted))" }}
                    />
                    <span>{et.nome}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(et.id)}
                      className="ml-1 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Excluir ${et.nome}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
