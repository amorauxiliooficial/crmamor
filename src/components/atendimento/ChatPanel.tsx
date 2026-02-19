import { useState } from "react";
import { UserCheck, Clock, CheckCircle, Tag, Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Conversa, Mensagem } from "@/data/atendimentoMock";

interface ChatPanelProps {
  conversa: Conversa | null;
  mensagens: Mensagem[];
}

const statusConfig = {
  aberto: { label: "Aberto", className: "bg-green-500/15 text-green-700 border-green-500/30" },
  pendente: { label: "Pendente", className: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" },
  fechado: { label: "Fechado", className: "bg-muted text-muted-foreground border-border" },
};

export function ChatPanel({ conversa, mensagens }: ChatPanelProps) {
  const [mensagem, setMensagem] = useState("");

  if (!conversa) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
        <MessageSquare className="h-12 w-12 opacity-30" />
        <p className="text-base">Selecione uma conversa para começar</p>
      </div>
    );
  }

  const status = statusConfig[conversa.status];
  const displayName = conversa.nome || conversa.telefone;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-base">{displayName}</h2>
            {conversa.nome && (
              <p className="text-xs text-muted-foreground">{conversa.telefone}</p>
            )}
          </div>
          <Badge variant="outline" className={cn("text-xs", status.className)}>
            {status.label}
          </Badge>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="gap-2 h-9 text-sm">
            <UserCheck className="h-4 w-4" />
            Assumir
          </Button>
          <Button variant="outline" size="sm" className="gap-2 h-9 text-sm">
            <Clock className="h-4 w-4" />
            Pendente
          </Button>
          <Button variant="outline" size="sm" className="gap-2 h-9 text-sm">
            <CheckCircle className="h-4 w-4" />
            Finalizar
          </Button>
          <Button variant="outline" size="sm" className="gap-2 h-9 text-sm">
            <Tag className="h-4 w-4" />
            Etiqueta
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3 max-w-2xl mx-auto">
          {mensagens.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.remetente === "atendente" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                  msg.remetente === "atendente"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md"
                )}
              >
                <p>{msg.texto}</p>
                <p
                  className={cn(
                    "text-[10px] mt-1",
                    msg.remetente === "atendente"
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  )}
                >
                  {msg.horario}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <Input
            placeholder="Digite sua mensagem..."
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            className="flex-1 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && mensagem.trim()) setMensagem("");
            }}
          />
          <Button size="icon" onClick={() => mensagem.trim() && setMensagem("")}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
