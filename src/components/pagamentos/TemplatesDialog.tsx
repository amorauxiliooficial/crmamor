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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTemplates } from "@/hooks/useTemplates";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Plus, Trash2, FileText, Edit } from "lucide-react";
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

interface TemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplatesDialog({ open, onOpenChange }: TemplatesDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { templates, isLoading, refetch } = useTemplates();
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [conteudo, setConteudo] = useState("");

  const resetForm = () => {
    setNome("");
    setConteudo("");
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (template: typeof templates[0]) => {
    setNome(template.nome);
    setConteudo(template.conteudo);
    setEditingId(template.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!nome.trim() || !conteudo.trim()) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Nome e conteúdo são obrigatórios",
      });
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from("templates_comunicado")
          .update({
            nome: nome.trim(),
            conteudo: conteudo.trim(),
          })
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Template atualizado com sucesso" });
      } else {
        const { error } = await supabase.from("templates_comunicado").insert({
          nome: nome.trim(),
          conteudo: conteudo.trim(),
          created_by: user?.id || null,
        });

        if (error) throw error;
        toast({ title: "Template criado com sucesso" });
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

    const { error } = await supabase
      .from("templates_comunicado")
      .delete()
      .eq("id", deleteId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message,
      });
    } else {
      toast({ title: "Template excluído com sucesso" });
      refetch();
    }

    setDeleteId(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Gerenciar Templates de Comunicado
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!showForm && (
              <Button onClick={() => setShowForm(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Criar Novo Template
              </Button>
            )}

            {showForm && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <Label>Nome do Template *</Label>
                    <Input
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Ex: Comunicado de Pagamento"
                    />
                  </div>
                  <div>
                    <Label>Conteúdo *</Label>
                    <Textarea
                      value={conteudo}
                      onChange={(e) => setConteudo(e.target.value)}
                      placeholder="Use variáveis como {{NOME_MAE}}, {{BANCO_NOME}}, {{VALOR_PARCELA}}..."
                      className="min-h-[200px] font-mono text-sm"
                    />
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Variáveis disponíveis:</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {[
                        "{{NOME_MAE}}",
                        "{{CPF}}",
                        "{{CEP}}",
                        "{{BANCO_NOME}}",
                        "{{BANCO_ENDERECO}}",
                        "{{VALOR_PARCELA}}",
                        "{{DATA_PAGAMENTO}}",
                        "{{NUMERO_PARCELA}}",
                        "{{TOTAL_PARCELAS}}",
                      ].map((v) => (
                        <code
                          key={v}
                          className="px-2 py-1 bg-background rounded cursor-pointer hover:bg-primary/10"
                          onClick={() => setConteudo((c) => c + v)}
                        >
                          {v}
                        </code>
                      ))}
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
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum template cadastrado
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{template.nome}</h4>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(template.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3 font-mono">
                        {template.conteudo}
                      </p>
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
            <AlertDialogTitle>Excluir template?</AlertDialogTitle>
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
