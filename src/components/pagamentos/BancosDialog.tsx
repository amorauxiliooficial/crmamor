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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBancos } from "@/hooks/useBancos";
import { Loader2, Plus, Trash2, Building2, Edit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

interface BancosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BancosDialog({ open, onOpenChange }: BancosDialogProps) {
  const { toast } = useToast();
  const { bancos, isLoading, refetch } = useBancos();
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");

  const resetForm = () => {
    setNome("");
    setEndereco("");
    setCidade("");
    setUf("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (banco: typeof bancos[0]) => {
    setNome(banco.nome);
    setEndereco(banco.endereco);
    setCidade(banco.cidade || "");
    setUf(banco.uf || "");
    setEditingId(banco.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!nome.trim() || !endereco.trim()) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Nome e endereço são obrigatórios",
      });
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from("bancos")
          .update({
            nome: nome.trim(),
            endereco: endereco.trim(),
            cidade: cidade.trim() || null,
            uf: uf.trim().toUpperCase() || null,
          })
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Banco atualizado com sucesso" });
      } else {
        const { error } = await supabase.from("bancos").insert({
          nome: nome.trim(),
          endereco: endereco.trim(),
          cidade: cidade.trim() || null,
          uf: uf.trim().toUpperCase() || null,
        });

        if (error) throw error;
        toast({ title: "Banco cadastrado com sucesso" });
      }

      refetch();
      resetForm();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const { error } = await supabase.from("bancos").delete().eq("id", deleteId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message,
      });
    } else {
      toast({ title: "Banco excluído com sucesso" });
      refetch();
    }

    setDeleteId(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Gerenciar Bancos
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!showForm && (
              <Button onClick={() => setShowForm(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Novo Banco
              </Button>
            )}

            {showForm && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Nome do Banco *</Label>
                      <Input
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Ex: Banco do Brasil - Agência Centro"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Endereço Completo *</Label>
                      <Input
                        value={endereco}
                        onChange={(e) => setEndereco(e.target.value)}
                        placeholder="Ex: Rua das Flores, 123 - Centro"
                      />
                    </div>
                    <div>
                      <Label>Cidade</Label>
                      <Input
                        value={cidade}
                        onChange={(e) => setCidade(e.target.value)}
                        placeholder="Ex: São Paulo"
                      />
                    </div>
                    <div>
                      <Label>UF</Label>
                      <Input
                        value={uf}
                        onChange={(e) => setUf(e.target.value)}
                        placeholder="Ex: SP"
                        maxLength={2}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {editingId ? "Atualizar" : "Salvar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : bancos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum banco cadastrado
              </div>
            ) : (
              <div className="space-y-2">
                {bancos.map((banco) => (
                  <Card key={banco.id}>
                    <CardContent className="p-3 flex items-start justify-between">
                      <div className="min-w-0">
                        <h4 className="font-medium">{banco.nome}</h4>
                        <p className="text-sm text-muted-foreground">
                          {banco.endereco}
                          {banco.cidade && ` - ${banco.cidade}`}
                          {banco.uf && `/${banco.uf}`}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(banco)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(banco.id)}
                        >
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir banco?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
