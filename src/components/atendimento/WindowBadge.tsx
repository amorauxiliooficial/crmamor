import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Clock, Lock, MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WindowBadgeProps {
  lastInboundAt: Date | null;
  onSendTemplate?: () => void;
  className?: string;
}

export function useWindowStatus(lastInboundAt: Date | null) {
  return useMemo(() => {
    if (!lastInboundAt) return { isOpen: false, expiresAt: null, remainingMs: 0 };
    const expiresAt = new Date(lastInboundAt.getTime() + 24 * 60 * 60 * 1000);
    const remainingMs = expiresAt.getTime() - Date.now();
    return { isOpen: remainingMs > 0, expiresAt, remainingMs };
  }, [lastInboundAt]);
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "expirado";
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h${mins > 0 ? `${mins}m` : ""}`;
  return `${mins}m`;
}

export function WindowBadge({ lastInboundAt, onSendTemplate, className }: WindowBadgeProps) {
  const { isOpen, expiresAt, remainingMs } = useWindowStatus(lastInboundAt);

  if (!lastInboundAt) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] h-5 gap-1 cursor-pointer border-destructive/30 text-destructive/70 hover:bg-destructive/5",
                className
              )}
              onClick={onSendTemplate}
            >
              <Lock className="h-2.5 w-2.5" />
              Janela fechada
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="text-xs">
            Sem mensagem recebida. Use um template para iniciar.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!isOpen) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] h-5 gap-1 cursor-pointer border-destructive/30 text-destructive/70 hover:bg-destructive/5",
                className
              )}
              onClick={onSendTemplate}
            >
              <Lock className="h-2.5 w-2.5" />
              Janela fechada
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="text-xs">
            Janela de 24h expirou. Envie um template aprovado.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] h-5 gap-1",
              remainingMs < 3600000
                ? "border-amber-400/30 text-amber-600 dark:text-amber-400"
                : "border-emerald-400/30 text-emerald-600 dark:text-emerald-400",
              className
            )}
          >
            <Clock className="h-2.5 w-2.5" />
            {formatRemaining(remainingMs)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="text-xs">
          Janela aberta até {expiresAt?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
