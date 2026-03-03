import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { User, ArrowRightLeft } from "lucide-react";

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransfer: (toAgentId: string, reason?: string) => void;
  currentAgentId?: string | null;
  isLoading?: boolean;
}

export function TransferDialog({ open, onOpenChange, onTransfer, currentAgentId, isLoading }: TransferDialogProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const { data: agents } = useQuery({
    queryKey: ["profiles_agents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name, email");
      if (error) throw error;
      return data as { id: string; full_name: string | null; email: string | null }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const availableAgents = (agents ?? []).filter(a => a.id !== currentAgentId && a.full_name);

  const handleTransfer = () => {
    if (!selectedAgent) return;
    onTransfer(selectedAgent, reason.trim() || undefined);
    setSelectedAgent(null);
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setSelectedAgent(null); setReason(""); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Transferir Atendimento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Selecione o atendente</p>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-1">
                {availableAgents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
                      selectedAgent === agent.id
                        ? "bg-primary/10 ring-1 ring-primary/20"
                        : "hover:bg-muted/30"
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs font-semibold bg-muted/50">
                        {agent.full_name?.charAt(0).toUpperCase() ?? <User className="h-3.5 w-3.5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{agent.full_name}</p>
                      {agent.email && <p className="text-xs text-muted-foreground/50 truncate">{agent.email}</p>}
                    </div>
                  </button>
                ))}
                {availableAgents.length === 0 && (
                  <p className="text-sm text-muted-foreground/50 text-center py-4">Nenhum atendente disponível</p>
                )}
              </div>
            </ScrollArea>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1.5">Motivo (opcional)</p>
            <Textarea
              placeholder="Ex: Cliente precisa de suporte financeiro..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleTransfer} disabled={!selectedAgent || isLoading}>
            {isLoading ? "Transferindo..." : "Transferir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
