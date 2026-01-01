import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import { StatusAbordagem, statusAbordagemLabels } from "@/types/indicacao";
import { Loader2 } from "lucide-react";

interface IndicacaoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function IndicacaoFormDialog({ open, onOpenChange, onSuccess }: IndicacaoFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_indicada: "",
    telefone_indicada: "",
    nome_indicadora: "",
    telefone_indicadora: "",
    status_abordagem: "pendente" as StatusAbordagem,
    motivo_abordagem: "",
    observacoes: "",
  });

  const resetForm = () => {
    setFormData({
      nome_indicada: "",
      telefone_indicada: "",
      nome_indicadora: "",
      telefone_indicadora: "",
      status_abordagem: "pendente",
      motivo_abordagem: "",
      observacoes: "",
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!formData.nome_indicada.trim()) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "O nome da indicada é obrigatório.",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("indicacoes").insert({
      nome_indicada: formData.nome_indicada.trim(),
      telefone_indicada: formData.telefone_indicada.trim() || null,
      nome_indicadora: formData.nome_indicadora.trim() || null,
      telefone_indicadora: formData.telefone_indicadora.trim() || null,
      status_abordagem: formData.status_abordagem,
      motivo_abordagem: formData.motivo_abordagem.trim() || null,
      observacoes: formData.observacoes.trim() || null,
      user_id: user.id,
    });

    if (error) {
      logError("create_indicacao", error);
      toast({
        variant: "destructive",
        title: "Erro ao criar indicação",
        description: getUserFriendlyError(error),
      });
    } else {
      toast({
        title: "Indicação criada",
        description: "A nova indicação foi registrada com sucesso.",
      });
      onSuccess();
      handleOpenChange(false);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Indicação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome_indicada">Nome da Indicada *</Label>
              <Input
                id="nome_indicada"
                value={formData.nome_indicada}
                onChange={(e) => setFormData({ ...formData, nome_indicada: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone_indicada">Telefone</Label>
              <Input
                id="telefone_indicada"
                value={formData.telefone_indicada}
                onChange={(e) => setFormData({ ...formData, telefone_indicada: e.target.value })}
                placeholder="+55 (XX) XXXXX-XXXX"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome_indicadora">Nome da Indicadora</Label>
              <Input
                id="nome_indicadora"
                value={formData.nome_indicadora}
                onChange={(e) => setFormData({ ...formData, nome_indicadora: e.target.value })}
                placeholder="Quem indicou"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone_indicadora">Tel. Indicadora</Label>
              <Input
                id="telefone_indicadora"
                value={formData.telefone_indicadora}
                onChange={(e) => setFormData({ ...formData, telefone_indicadora: e.target.value })}
                placeholder="+55 (XX) XXXXX-XXXX"
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
              value={formData.motivo_abordagem}
              onChange={(e) => setFormData({ ...formData, motivo_abordagem: e.target.value })}
              placeholder="Ex: Primeiro contato, follow-up, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={3}
              placeholder="Anotações adicionais..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Indicação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
