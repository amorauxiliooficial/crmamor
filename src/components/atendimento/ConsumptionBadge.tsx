import { useState } from "react";
import { DollarSign, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useRateCards, useMonthlyBilling, useConversationBilling, useBillingSettings, estimateCost } from "@/hooks/useBillingData";
import { useWindowStatus } from "@/components/atendimento/WindowBadge";
import { ConsumptionDrawer } from "@/components/atendimento/ConsumptionDrawer";

const USD_TO_BRL = 5.80;
function toBRL(usd: number): string {
  const brl = usd * USD_TO_BRL;
  return `R$ ${brl.toFixed(2)}`;
}

interface ConsumptionBadgeProps {
  conversationId: string | null;
  lastInboundAt: Date | null;
  className?: string;
}

export function ConsumptionBadge({ conversationId, lastInboundAt, className }: ConsumptionBadgeProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: rateCards = [] } = useRateCards();
  const { data: monthly } = useMonthlyBilling();
  const { data: settings } = useBillingSettings();
  const windowStatus = useWindowStatus(lastInboundAt);
  const convoBilling = useConversationBilling(conversationId);

  const estimate = estimateCost(rateCards, windowStatus.isOpen);
  const monthTotal = monthly?.monthTotal ?? 0;
  const monthLimit = settings?.monthly_limit ?? 500;
  const pct = monthLimit > 0 ? (monthTotal / monthLimit) * 100 : 0;

  const isWarning = pct > 80;
  const isDanger = pct > 95;

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] h-5 gap-1 cursor-pointer transition-colors",
                isDanger
                  ? "border-destructive/30 text-destructive/70 hover:bg-destructive/5"
                  : isWarning
                    ? "border-amber-400/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/5"
                    : "border-border/30 text-muted-foreground/60 hover:bg-muted/10",
                className
              )}
              onClick={() => setDrawerOpen(true)}
            >
              <DollarSign className="h-2.5 w-2.5" />
              {windowStatus.isOpen ? "Grátis" : `~${toBRL(estimate.cost)}`}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="text-xs space-y-1">
            <p className="font-medium">Consumo WhatsApp</p>
            <p>Próxima msg: {estimate.label}</p>
            <p>Mês: {toBRL(monthTotal)} / {toBRL(monthLimit, 0)} ({pct.toFixed(0)}%)</p>
            <p className="text-muted-foreground/60">Clique para detalhes</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ConsumptionDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        conversationId={conversationId}
        lastInboundAt={lastInboundAt}
      />
    </>
  );
}
