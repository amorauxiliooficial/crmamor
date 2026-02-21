import { memo } from "react";
import { Check, CheckCheck, Clock, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MessageStatusIconProps {
  status: string | null | undefined;
  errorMessage?: string | null;
  className?: string;
}

export const MessageStatusIcon = memo(function MessageStatusIcon({
  status,
  errorMessage,
  className,
}: MessageStatusIconProps) {
  if (!status) return null;

  switch (status) {
    case "pending":
      return (
        <Clock className={cn("h-3 w-3 text-muted-foreground/40", className)} />
      );

    case "sent":
      return (
        <Check className={cn("h-3 w-3 text-muted-foreground/50", className)} />
      );

    case "delivered":
      return (
        <CheckCheck className={cn("h-3 w-3 text-muted-foreground/50", className)} />
      );

    case "read":
      return (
        <CheckCheck className={cn("h-3 w-3 text-primary", className)} />
      );

    case "failed":
      return (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertCircle className={cn("h-3 w-3 text-destructive", className)} />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-[200px]">
              {errorMessage || "Falha ao enviar"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

    default:
      return null;
  }
});
