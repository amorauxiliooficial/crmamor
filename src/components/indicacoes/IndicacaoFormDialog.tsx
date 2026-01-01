import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import { StatusAbordagem, statusAbordagemLabels, statusAbordagemColors, ProximaAcao, proximaAcaoColors, MotivoAbordagem, motivoAbordagemLabels } from "@/types/indicacao";
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
    motivo_abordagem: "" as MotivoAbordagem | "",
    observacoes: "",
    proxima_acao: undefined as ProximaAcao | undefined,
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
      proxima_acao: undefined,
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const handleStatusChange = (status: StatusAbordagem) => {
    setFormData({ ...formData, status_abordagem: status });
  };

  const handleProximaAcao = (acao: ProximaAcao) => {
    setFormData({ ...formData, proxima_acao: acao, status_abordagem: "em_andamento" });
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

    const { data: indicacao, error } = await supabase.from("indicacoes").insert({
      nome_indicada: formData.nome_indicada.trim(),
      telefone_indicada: formData.telefone_indicada.trim() || null,
      nome_indicadora: formData.nome_indicadora.trim() || null,
      telefone_indicadora: formData.telefone_indicadora.trim() || null,
      status_abordagem: formData.status_abordagem,
      motivo_abordagem: formData.motivo_abordagem || null,
      observacoes: formData.observacoes.trim() || null,
      proxima_acao: formData.proxima_acao || null,
      user_id: user.id,
    }).select().single();

    if (error) {
      logError("create_indicacao", error);
      toast({
        variant: "destructive",
        title: "Erro ao criar indicação",
        description: getUserFriendlyError(error),
      });
    } else {
      // Register initial action
      if (indicacao) {
        await supabase.from("acoes_indicacao").insert({
          indicacao_id: indicacao.id,
          tipo_acao: "Indicação criada",
          user_id: user.id,
        });
      }
      
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
          <DialogDescription>Preencha os dados da nova indicação.</DialogDescription>
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
            <Label>Status da Abordagem</Label>
            <div className="flex gap-2">
              {(["pendente", "em_andamento", "concluido"] as StatusAbordagem[]).map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={formData.status_abordagem === status ? "default" : "outline"}
                  className={formData.status_abordagem === status ? statusAbordagemColors[status] : ""}
                  onClick={() => handleStatusChange(status)}
                >
                  {statusAbordagemLabels[status]}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Select
              value={formData.motivo_abordagem}
              onValueChange={(value) => setFormData({ ...formData, motivo_abordagem: value as MotivoAbordagem })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(motivoAbordagemLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <div className="space-y-2">
            <Label>Próxima Ação</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={formData.proxima_acao === "primeiro_contato" ? "default" : "outline"}
                className={formData.proxima_acao === "primeiro_contato" ? proximaAcaoColors.primeiro_contato : ""}
                onClick={() => handleProximaAcao("primeiro_contato")}
              >
                1º Contato
              </Button>
              <Button
                type="button"
                size="sm"
                variant={formData.proxima_acao === "follow_up" ? "default" : "outline"}
                className={formData.proxima_acao === "follow_up" ? proximaAcaoColors.follow_up : ""}
                onClick={() => handleProximaAcao("follow_up")}
              >
                Follow Up
              </Button>
              <Button
                type="button"
                size="sm"
                variant={formData.proxima_acao === "proxima_acao" ? "default" : "outline"}
                className={formData.proxima_acao === "proxima_acao" ? proximaAcaoColors.proxima_acao : ""}
                onClick={() => handleProximaAcao("proxima_acao")}
              >
                Próx. Ação
              </Button>
            </div>
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