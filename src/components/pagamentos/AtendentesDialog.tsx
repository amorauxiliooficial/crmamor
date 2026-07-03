import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAtendentesComunicado, AtendenteComunicado } from "@/hooks/useAtendentesComunicado";
import { Loader2, Plus, Trash2, UserCircle2, Edit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AtendentesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AtendentesDialog({ open, onOpenChange }: AtendentesDialogProps) {
  const { toast } = useToast();
  const { atendentes, isLoading, upsert, remove } = useAtendentesComunicado();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AtendenteComunicado | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [ativo, setAtivo] = useState(true);

  const reset = () => {
    setNome("");
    setCargo("");
    setAtivo(true);
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (a: AtendenteComunicado) => {
    setEditing(a);
    setNome(a.nome);
    setCargo(a.cargo ?? "");
    setAtivo(a.ativo);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast({ variant: "destructive", title: "Nome é obrigatório" });
      return;
    }
    try {
      await upsert.mutateAsync({
        id: editing?.id,
        nome: nome.trim(),
        cargo: cargo.trim() || null,
        ativo,
      });
      toast({ title: editing ? "Atendente atualizado" : "Atendente cadastrado" });
      reset();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await remove.mutateAsync(deleteId);
      toast({ title: "Atendente removido" });
      setDeleteId(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCircle2 className="h-5 w-5" />
              Atendentes do Comunicado
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!showForm && (
              <Button onClick={() => setShowForm(true)} size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-1" /> Novo atendente
              </Button>
            )}

            {showForm && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label>Nome *</Label>
                    <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Vinicius" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cargo / Setor</Label>
                    <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex.: Financeiro" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={ativo} onCheckedChange={setAtivo} id="ativo-at" />
                    <Label htmlFor="ativo-at">Ativo</Label>
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <Button variant="ghost" onClick={reset}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={upsert.isPending}>
                      {upsert.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                      Salvar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : atendentes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum atendente cadastrado.</p>
            ) : (
              <div className="space-y-2">
                {atendentes.map((a) => (
                  <Card key={a.id}>
                    <CardContent className="p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{a.nome}</p>
                          {!a.ativo && <Badge variant="outline" className="text-xs">Inativo</Badge>}
                        </div>
                        {a.cargo && <p className="text-xs text-muted-foreground">{a.cargo}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(a)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteId(a.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover atendente?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
