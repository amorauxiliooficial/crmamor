import { useState } from "react";
import { MaeProcesso } from "@/types/mae";
import { TipoAtividade, TIPO_ATIVIDADE_LABELS } from "@/types/atividade";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarPlus, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";

interface AgendarFollowUpDialogProps {
  mae: MaeProcesso;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFollowUpAgendado: () => void;
}

export function AgendarFollowUpDialog({
  mae,
  open,
  onOpenChange,
  onFollowUpAgendado,
}: AgendarFollowUpDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [tipoAcao, setTipoAcao] = useState<TipoAtividade>("ligacao");
  const [dataFollowUp, setDataFollowUp] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [horaFollowUp, setHoraFollowUp] = useState("10:00");
  const [observacao, setObservacao] = useState("");

  const handleAgendar = async () => {
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast({ variant: "destructive", title: "Erro", description: "Usuário não autenticado" });
      setLoading(false);
      return;
    }

    const dataProximaAcao = new Date(`${dataFollowUp}T${horaFollowUp}:00`);

    const { error } = await supabase.from("atividades_mae").insert({
      mae_id: mae.id,
      user_id: userData.user.id,
      tipo_atividade: tipoAcao,
      descricao: observacao || `Follow-up agendado: ${TIPO_ATIVIDADE_LABELS[tipoAcao]}`,
      data_atividade: new Date().toISOString(),
      proxima_acao: tipoAcao,
      data_proxima_acao: dataProximaAcao.toISOString(),
      status_followup: "agendado",
      concluido: false,
    });

    setLoading(false);

    if (error) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível agendar." });
    } else {
      toast({ title: "✓ Agendado", description: `Follow-up para ${format(dataProximaAcao, "dd/MM 'às' HH:mm")}` });
      onFollowUpAgendado();
      onOpenChange(false);
      // Reset form
      setTipoAcao("ligacao");
      setDataFollowUp(format(addDays(new Date(), 1), "yyyy-MM-dd"));
      setHoraFollowUp("10:00");
      setObservacao("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Agendar Follow-up
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Cliente Info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium text-sm">{mae.nome_mae}</p>
            <p className="text-xs text-muted-foreground">{mae.status_processo}</p>
          </div>

          {/* Tipo de Ação */}
          <div className="space-y-2">
            <Label>Tipo de Ação</Label>
            <Select value={tipoAcao} onValueChange={(v) => setTipoAcao(v as TipoAtividade)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_ATIVIDADE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={dataFollowUp}
                onChange={(e) => setDataFollowUp(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
              />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input
                type="time"
                value={horaFollowUp}
                onChange={(e) => setHoraFollowUp(e.target.value)}
              />
            </div>
          </div>

          {/* Observação */}
          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Textarea
              placeholder="Motivo do follow-up..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAgendar} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CalendarPlus className="h-4 w-4 mr-2" />}
            Agendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
