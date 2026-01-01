import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import { StatusAbordagem, statusAbordagemLabels, ProximaAcao, proximaAcaoLabels, MotivoAbordagem, motivoAbordagemLabels } from "@/types/indicacao";
import { Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
    proxima_acao: "" as ProximaAcao | "",
    proxima_acao_observacao: "",
  });
  const [proximaAcaoDate, setProximaAcaoDate] = useState<Date | undefined>();
  const [proximaAcaoTime, setProximaAcaoTime] = useState("09:00");

  const resetForm = () => {
    setFormData({
      nome_indicada: "",
      telefone_indicada: "",
      nome_indicadora: "",
      telefone_indicadora: "",
      status_abordagem: "pendente",
      motivo_abordagem: "",
      observacoes: "",
      proxima_acao: "",
      proxima_acao_observacao: "",
    });
    setProximaAcaoDate(undefined);
    setProximaAcaoTime("09:00");
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

    // Build próxima ação datetime
    let proximaAcaoDatetime: string | null = null;
    if (proximaAcaoDate) {
      const [hours, minutes] = proximaAcaoTime.split(":").map(Number);
      const dateWithTime = new Date(proximaAcaoDate);
      dateWithTime.setHours(hours, minutes, 0, 0);
      proximaAcaoDatetime = dateWithTime.toISOString();
    }

    const { data: indicacao, error } = await supabase.from("indicacoes").insert({
      nome_indicada: formData.nome_indicada.trim(),
      telefone_indicada: formData.telefone_indicada.trim() || null,
      nome_indicadora: formData.nome_indicadora.trim() || null,
      telefone_indicadora: formData.telefone_indicadora.trim() || null,
      status_abordagem: formData.status_abordagem,
      motivo_abordagem: formData.motivo_abordagem || null,
      observacoes: formData.observacoes.trim() || null,
      proxima_acao: formData.proxima_acao || null,
      proxima_acao_data: proximaAcaoDatetime,
      proxima_acao_observacao: formData.proxima_acao_observacao.trim() || null,
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
          observacao: formData.proxima_acao_observacao.trim() || null,
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status da Abordagem</Label>
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
              <Label>Motivo</Label>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações Gerais</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              rows={2}
              placeholder="Anotações adicionais..."
            />
          </div>

          {/* Próxima Ação Section */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <Label className="text-base font-semibold">Próxima Ação</Label>
            
            <div className="space-y-2">
              <Label>Tipo de Ação</Label>
              <Select
                value={formData.proxima_acao}
                onValueChange={(value) => setFormData({ ...formData, proxima_acao: value as ProximaAcao })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a ação" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(proximaAcaoLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Agendada</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !proximaAcaoDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {proximaAcaoDate ? format(proximaAcaoDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={proximaAcaoDate}
                      onSelect={setProximaAcaoDate}
                      initialFocus
                      locale={ptBR}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={proximaAcaoTime}
                  onChange={(e) => setProximaAcaoTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observação da Ação</Label>
              <Textarea
                value={formData.proxima_acao_observacao}
                onChange={(e) => setFormData({ ...formData, proxima_acao_observacao: e.target.value })}
                rows={2}
                placeholder="Descreva detalhes sobre esta ação..."
              />
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