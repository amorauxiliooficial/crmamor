import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MaeProcesso } from "@/types/mae";
import { Loader2, CheckCircle2 } from "lucide-react";

interface VerificacaoGestanteDialogProps {
  mae: MaeProcesso | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function VerificacaoGestanteDialog({
  mae,
  open,
  onOpenChange,
  onSuccess,
}: VerificacaoGestanteDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [atualizacaoRealizada, setAtualizacaoRealizada] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const handleSubmit = async () => {
    if (!mae || !user) return;

    if (!atualizacaoRealizada.trim()) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Informe a atualização realizada com a mãe.",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("verificacao_gestante").insert({
        mae_id: mae.id,
        user_id: user.id,
        atualizacao_realizada: atualizacaoRealizada.trim(),
        observacoes: observacoes.trim() || null,
      });

      if (error) throw error;

      toast({
        title: "Verificação registrada",
        description: `Verificação de ${mae.nome_mae} registrada com sucesso.`,
      });

      setAtualizacaoRealizada("");
      setObservacoes("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao registrar verificação",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Verificação de Gestante - 7º Mês
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium">{mae?.nome_mae}</p>
            <p className="text-xs text-muted-foreground">
              DPP: {mae?.data_evento ? new Date(mae.data_evento).toLocaleDateString("pt-BR") : "-"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="atualizacao">
              Atualização realizada <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="atualizacao"
              placeholder="Descreva a atualização feita com essa mãe..."
              value={atualizacaoRealizada}
              onChange={(e) => setAtualizacaoRealizada(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Textarea
              id="observacoes"
              placeholder="Observações adicionais..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Verificação
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
