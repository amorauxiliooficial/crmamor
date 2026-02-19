import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import type { Conversa } from "@/data/atendimentoMock";

interface ConversaCardProps {
  conversa: Conversa;
  selected: boolean;
  onClick: () => void;
}

const statusConfig = {
  aberto: { label: "Aberto", className: "bg-green-500/15 text-green-700 border-green-500/30" },
  pendente: { label: "Pendente", className: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30" },
  fechado: { label: "Fechado", className: "bg-muted text-muted-foreground border-border" },
};

export function ConversaCard({ conversa, selected, onClick }: ConversaCardProps) {
  const status = statusConfig[conversa.status];
  const displayName = conversa.nome || conversa.telefone;
  const initials = conversa.nome
    ? conversa.nome.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-3 border-b border-border transition-colors hover:bg-accent/50",
        selected && "bg-primary/10 border-l-2 border-l-primary"
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {initials || <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm truncate">{displayName}</span>
            <span className="text-xs text-muted-foreground shrink-0">{conversa.horario}</span>
          </div>

          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {conversa.ultimaMensagem}
          </p>

          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5", status.className)}>
                {status.label}
              </Badge>
              <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                {conversa.atendente || "Sem atendente"}
              </span>
            </div>

            {conversa.naoLidas > 0 && (
              <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full">
                {conversa.naoLidas}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
