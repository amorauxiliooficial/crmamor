import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import { Indicacao, StatusAbordagem, statusAbordagemLabels } from "@/types/indicacao";
import { Loader2, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface IndicacaoDialogProps {
  indicacao: Indicacao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function IndicacaoDialog({ indicacao, open, onOpenChange, onSuccess }: IndicacaoDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Indicacao>>({});

  // Initialize form when indicacao changes
  useState(() => {
    if (indicacao) {
      setFormData({
        nome_indicada: indicacao.nome_indicada,
        telefone_indicada: indicacao.telefone_indicada,
        nome_indicadora: indicacao.nome_indicadora,
        telefone_indicadora: indicacao.telefone_indicadora,
        status_abordagem: indicacao.status_abordagem,
        motivo_abordagem: indicacao.motivo_abordagem,
        observacoes: indicacao.observacoes,
      });
    }
  });

  // Reset form when dialog opens with new indicacao
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && indicacao) {
      setFormData({
        nome_indicada: indicacao.nome_indicada,
        telefone_indicada: indicacao.telefone_indicada,
        nome_indicadora: indicacao.nome_indicadora,
        telefone_indicadora: indicacao.telefone_indicadora,
        status_abordagem: indicacao.status_abordagem,
        motivo_abordagem: indicacao.motivo_abordagem,
        observacoes: indicacao.observacoes,
      });
    }
    onOpenChange(isOpen);
  };

  const handleSave = async () => {
    if (!indicacao) return;
    setLoading(true);

    const { error } = await supabase
      .from("indicacoes")
      .update({
        nome_indicada: formData.nome_indicada,
        telefone_indicada: formData.telefone_indicada,
        nome_indicadora: formData.nome_indicadora,
        telefone_indicadora: formData.telefone_indicadora,
        status_abordagem: formData.status_abordagem,
        motivo_abordagem: formData.motivo_abordagem,
        observacoes: formData.observacoes,
      })
      .eq("id", indicacao.id);

    if (error) {
      logError("update_indicacao", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: getUserFriendlyError(error),
      });
    } else {
      toast({
        title: "Indicação atualizada",
        description: "Os dados foram salvos com sucesso.",
      });
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!indicacao) return;
    setLoading(true);

    const { error } = await supabase.from("indicacoes").delete().eq("id", indicacao.id);

    if (error) {
      logError("delete_indicacao", error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: getUserFriendlyError(error),
      });
    } else {
      toast({
        title: "Indicação excluída",
        description: "O registro foi removido com sucesso.",
      });
      onSuccess();
      onOpenChange(false);
    }
    setLoading(false);
  };

  if (!indicacao) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Indicação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome_indicada">Nome da Indicada</Label>
              <Input
                id="nome_indicada"
                value={formData.nome_indicada || ""}
                onChange={(e) => setFormData({ ...formData, nome_indicada: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone_indicada">Telefone</Label>
              <Input
                id="telefone_indicada"
                value={formData.telefone_indicada || ""}
                onChange={(e) => setFormData({ ...formData, telefone_indicada: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome_indicadora">Nome da Indicadora</Label>
              <Input
                id="nome_indicadora"
                value={formData.nome_indicadora || ""}
                onChange={(e) => setFormData({ ...formData, nome_indicadora: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone_indicadora">Tel. Indicadora</Label>
              <Input
                id="telefone_indicadora"
                value={formData.telefone_indicadora || ""}
                onChange={(e) => setFormData({ ...formData, telefone_indicadora: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status da Abordagem</Label>
            <Select
              value={formData.status_abordagem}
              onValueChange={(value) => setFormData({ ...formData, status_abordagem: value as StatusAbordagem })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusAbordagemLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo da Abordagem</Label>
            <Input
              id="motivo"
              value={formData.motivo_abordagem || ""}
              onChange={(e) => setFormData({ ...formData, motivo_abordagem: e.target.value })}
              placeholder="Ex: Primeiro contato, follow-up, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes || ""}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={loading}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. A indicação será permanentemente removida.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
