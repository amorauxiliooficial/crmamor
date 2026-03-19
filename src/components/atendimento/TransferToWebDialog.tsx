import { useState, useMemo, useCallback } from "react";
import { Globe, Loader2, Wifi, WifiOff, Radio } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useWhatsappInstances } from "@/hooks/useWhatsappInstances";
import { transferConversationToEvolution } from "@/services/conversationTransfer";

interface TransferToWebDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conversationId: string;
  contactPhone: string;
  contactName: string | null;
  summary?: string | null;
  onTransferred: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Wifi }> = {
  connected: { label: "Conectada", color: "text-emerald-500", icon: Wifi },
  disconnected: { label: "Desconectada", color: "text-destructive", icon: WifiOff },
  qr_pending: { label: "Aguardando QR", color: "text-amber-500", icon: Radio },
};

export function TransferToWebDialog({
  open,
  onOpenChange,
  conversationId,
  contactName,
  onTransferred,
}: TransferToWebDialogProps) {
  const { toast } = useToast();
  const { data: instances = [], isLoading: loadingInstances } = useWhatsappInstances();
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [transferring, setTransferring] = useState(false);

  const connectedInstances = useMemo(
    () => instances.filter(i => i.status === "connected"),
    [instances]
  );

  const selectedInstance = useMemo(
    () => instances.find(i => i.id === selectedInstanceId),
    [instances, selectedInstanceId]
  );

  const handleTransfer = useCallback(async () => {
    if (!selectedInstanceId) {
      toast({ title: "Selecione uma instância", variant: "destructive" });
      return;
    }

    setTransferring(true);
    const result = await transferConversationToEvolution({
      conversationId,
      instanceId: selectedInstanceId,
      reason: reason.trim() || undefined,
    });

    setTransferring(false);

    if (result.success) {
      toast({ title: "Conversa transferida para WhatsApp Web ✅" });
      onTransferred();
      onOpenChange(false);
      setSelectedInstanceId("");
      setReason("");
    } else {
      toast({ title: "Erro na transferência", description: result.error, variant: "destructive" });
    }
  }, [selectedInstanceId, conversationId, reason, toast, onTransferred, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-amber-500" />
            Transferir para WhatsApp Web
          </DialogTitle>
          <DialogDescription>
            {contactName
              ? `Transferir atendimento de ${contactName} para uma instância WhatsApp Web (Evolution).`
              : "Transferir atendimento para uma instância WhatsApp Web (Evolution)."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Instance selector */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Instância de destino</Label>
            {loadingInstances ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 border rounded-lg">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando instâncias...
              </div>
            ) : instances.length === 0 ? (
              <div className="text-xs text-muted-foreground/60 p-3 border border-dashed rounded-lg text-center">
                Nenhuma instância cadastrada.
                <br />
                <span className="text-primary">Crie uma em Configurações → WhatsApp Instances.</span>
              </div>
            ) : (
              <Select value={selectedInstanceId} onValueChange={setSelectedInstanceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma instância..." />
                </SelectTrigger>
                <SelectContent>
                  {instances.map((inst) => {
                    const cfg = STATUS_CONFIG[inst.status] ?? STATUS_CONFIG.disconnected;
                    const Icon = cfg.icon;
                    return (
                      <SelectItem
                        key={inst.id}
                        value={inst.id}
                        disabled={inst.status !== "connected"}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                          <span>{inst.name}</span>
                          <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>
                            {cfg.label}
                          </Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}

            {connectedInstances.length === 0 && instances.length > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                ⚠️ Nenhuma instância conectada. Conecte uma via QR Code antes de transferir.
              </p>
            )}
          </div>

          {/* Selected instance info */}
          {selectedInstance && (
            <div className="p-3 bg-muted/10 border border-border/20 rounded-lg text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Instância:</span>
                <span className="font-medium">{selectedInstance.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Evolution name:</span>
                <span className="font-mono text-[11px]">{selectedInstance.evolution_instance_name}</span>
              </div>
              {selectedInstance.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Número:</span>
                  <span>{selectedInstance.phone}</span>
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Motivo (opcional)</Label>
            <Textarea
              placeholder="Ex: janela 24h expirada, cliente pediu resposta rápida..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[50px] text-sm"
            />
          </div>

          {/* Confirm */}
          <Button
            className="w-full gap-2"
            onClick={handleTransfer}
            disabled={!selectedInstanceId || transferring}
          >
            {transferring ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Globe className="h-4 w-4" />
            )}
            {transferring ? "Transferindo..." : "Confirmar transferência para Web"}
          </Button>

          <p className="text-[10px] text-muted-foreground/50 text-center">
            As mensagens anteriores serão mantidas. Novas mensagens irão pelo WhatsApp Web.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
