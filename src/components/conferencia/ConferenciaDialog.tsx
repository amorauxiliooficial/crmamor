import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";

interface ConferenciaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maeId: string;
  maeNome: string;
  onSuccess: () => void;
}

export function ConferenciaDialog({
  open,
  onOpenChange,
  maeId,
  maeNome,
  onSuccess,
}: ConferenciaDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [houveAtualizacao, setHouveAtualizacao] = useState<string>("nao");
  const [observacoes, setObservacoes] = useState("");

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para registrar uma conferência.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.from("conferencia_inss").insert({
      mae_id: maeId,
      user_id: user.id,
      houve_atualizacao: houveAtualizacao === "sim",
      observacoes: observacoes.trim() || null,
    });

    setIsLoading(false);

    if (error) {
      logError('conferencia_submit', error);
      toast({
        title: "Erro ao registrar conferência",
        description: getUserFriendlyError(error),
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Conferência registrada",
      description: `Conferência de ${maeNome} registrada com sucesso.`,
    });

    // Reset form
    setHouveAtualizacao("nao");
    setObservacoes("");
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Conferência INSS</DialogTitle>
          <DialogDescription>
            Registrar conferência para: <strong>{maeNome}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Houve atualização no INSS?</Label>
            <RadioGroup
              value={houveAtualizacao}
              onValueChange={setHouveAtualizacao}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id="sim" />
                <Label htmlFor="sim" className="flex items-center gap-1 cursor-pointer">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Sim
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id="nao" />
                <Label htmlFor="nao" className="flex items-center gap-1 cursor-pointer">
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                  Não
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Descreva detalhes da conferência..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registrar Conferência
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
