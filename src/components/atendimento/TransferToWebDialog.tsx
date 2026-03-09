import { useState, useMemo, useCallback } from "react";
import { Globe, Copy, Check, QrCode, ExternalLink, StickyNote, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useChannels } from "@/hooks/useChannels";
import { supabase } from "@/integrations/supabase/client";

interface TransferToWebDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conversationId: string;
  contactPhone: string;
  contactName: string | null;
  summary?: string | null;
  onTransferred: () => void;
}

export function TransferToWebDialog({
  open,
  onOpenChange,
  conversationId,
  contactPhone,
  contactName,
  summary,
  onTransferred,
}: TransferToWebDialogProps) {
  const { toast } = useToast();
  const { data: channels } = useChannels();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [agentNote, setAgentNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const webChannel = useMemo(() => {
    return channels?.find((c) => c.code === "web_manual_team");
  }, [channels]);

  const cleanPhone = contactPhone.replace(/\D/g, "");
  const waLink = `https://wa.me/${cleanPhone}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(waLink)}`;

  const bridgeMessage = useMemo(() => {
    const name = contactName || "Cliente";
    return `Olá ${name}! Estamos dando continuidade ao seu atendimento por aqui. Em que posso ajudar? 😊`;
  }, [contactName]);

  const summaryText = summary || "Sem resumo disponível.";

  const handleCopy = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({ title: "Copiado! ✅" });
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  }, [toast]);

  const handleSaveNote = useCallback(async () => {
    if (!agentNote.trim()) return;
    setSavingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Save as conversation event with type 'agent_note'
      const { error } = await supabase.from("conversation_events").insert({
        conversation_id: conversationId,
        event_type: "agent_note",
        created_by_agent_id: user?.id,
        meta: { note: agentNote.trim() },
      } as any);
      if (error) throw error;
      toast({ title: "Nota salva ✅" });
      setAgentNote("");
    } catch {
      toast({ title: "Erro ao salvar nota", variant: "destructive" });
    } finally {
      setSavingNote(false);
    }
  }, [agentNote, conversationId, toast]);

  const handleConfirmTransfer = useCallback(() => {
    onTransferred();
    onOpenChange(false);
  }, [onTransferred, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-amber-500" />
            Transferir para WhatsApp Web
          </DialogTitle>
          <DialogDescription>
            Abra a conversa no WhatsApp Web da equipe para atendimento manual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* wa.me link */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Link direto</Label>
            <div className="flex items-center gap-2 p-3 bg-muted/10 border border-border/20 rounded-lg">
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm text-primary truncate hover:underline"
              >
                {waLink}
              </a>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                onClick={() => handleCopy(waLink, "link")}
              >
                {copiedField === "link" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                asChild
              >
                <a href={waLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>

          {/* QR Code */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <QrCode className="h-3.5 w-3.5" /> QR Code
            </Label>
            <div className="flex justify-center p-4 bg-background border border-border/20 rounded-lg">
              <img
                src={qrUrl}
                alt="QR Code para WhatsApp"
                className="h-40 w-40 rounded"
                loading="lazy"
              />
            </div>
          </div>

          <Separator />

          {/* Bridge message */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Mensagem ponte</Label>
            <div className="relative">
              <div className="p-3 bg-muted/10 border border-border/20 rounded-lg text-sm">
                {bridgeMessage}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-1 right-1 h-7 gap-1 text-xs"
                onClick={() => handleCopy(bridgeMessage, "bridge")}
              >
                {copiedField === "bridge" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                Copiar
              </Button>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Resumo da conversa</Label>
            <div className="relative">
              <div className="p-3 bg-muted/10 border border-border/20 rounded-lg text-sm max-h-[120px] overflow-y-auto whitespace-pre-line">
                {summaryText}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-1 right-1 h-7 gap-1 text-xs"
                onClick={() => handleCopy(summaryText, "summary")}
              >
                {copiedField === "summary" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                Copiar
              </Button>
            </div>
          </div>

          <Separator />

          {/* Agent Note */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <StickyNote className="h-3.5 w-3.5" /> Nota do atendente
            </Label>
            <Textarea
              placeholder="Adicione uma nota sobre o handoff..."
              value={agentNote}
              onChange={(e) => setAgentNote(e.target.value)}
              className="min-h-[60px] text-sm"
            />
            {agentNote.trim() && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={handleSaveNote}
                disabled={savingNote}
              >
                <Send className="h-3 w-3" />
                Salvar nota no histórico
              </Button>
            )}
          </div>

          {/* Confirm */}
          <Button className="w-full gap-2" onClick={handleConfirmTransfer}>
            <Globe className="h-4 w-4" />
            Confirmar transferência para Web
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
