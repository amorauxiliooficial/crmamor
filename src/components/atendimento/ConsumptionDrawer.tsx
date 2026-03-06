import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, MessageSquare, TrendingUp, Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMonthlyBilling, useConversationBilling, useBillingSettings, useRateCards, estimateCost } from "@/hooks/useBillingData";
import { useWindowStatus } from "@/components/atendimento/WindowBadge";

const USD_TO_BRL = 5.80;
function toBRL(usd: number): string {
  const brl = usd * USD_TO_BRL;
  return `R$ ${brl.toFixed(2)}`;
}

const CATEGORY_COLORS: Record<string, string> = {
  marketing: "text-purple-600 dark:text-purple-400",
  utility: "text-blue-600 dark:text-blue-400",
  authentication: "text-amber-600 dark:text-amber-400",
  service: "text-emerald-600 dark:text-emerald-400",
  unknown: "text-muted-foreground",
};

const CATEGORY_LABELS: Record<string, string> = {
  marketing: "Marketing",
  utility: "Utility",
  authentication: "Authentication",
  service: "Service",
  unknown: "Outro",
};

interface ConsumptionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string | null;
  lastInboundAt: Date | null;
}

export function ConsumptionDrawer({ open, onOpenChange, conversationId, lastInboundAt }: ConsumptionDrawerProps) {
  const { data: monthly } = useMonthlyBilling();
  const convoBilling = useConversationBilling(conversationId);
  const { data: settings } = useBillingSettings();
  const { data: rateCards = [] } = useRateCards();
  const windowStatus = useWindowStatus(lastInboundAt);

  const monthTotal = monthly?.monthTotal ?? 0;
  const todayTotal = monthly?.todayTotal ?? 0;
  const monthLimit = settings?.monthly_limit ?? 500;
  const dailyLimit = settings?.daily_limit ?? 50;
  const monthPct = monthLimit > 0 ? Math.min((monthTotal / monthLimit) * 100, 100) : 0;
  const dayPct = dailyLimit > 0 ? Math.min((todayTotal / dailyLimit) * 100, 100) : 0;

  const nextEstimate = estimateCost(rateCards, windowStatus.isOpen);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Consumo WhatsApp
          </DrawerTitle>
          <DrawerDescription className="text-xs">
            Estimativas e custos reais da API
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="px-4 pb-6 max-h-[65vh]">
          <div className="space-y-5">
            {/* Next action estimate */}
            <div className="p-3 rounded-xl bg-muted/10 border border-border/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Próxima mensagem</span>
                <Badge variant="outline" className="text-[10px] h-5">
                  {windowStatus.isOpen ? "Janela aberta" : "Janela fechada"}
                </Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {nextEstimate.cost === 0 ? "Grátis" : toBRL(nextEstimate.cost)}
                </span>
                <span className="text-xs text-muted-foreground/60">
                  {nextEstimate.category}
                </span>
              </div>
              {!windowStatus.isOpen && (
                <p className="text-[11px] text-muted-foreground/50">
                  Use um template aprovado. O custo varia por categoria.
                </p>
              )}
            </div>

            {/* This conversation */}
            {conversationId && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground/70 flex items-center gap-1.5">
                  <MessageSquare className="h-3 w-3" /> Esta conversa
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="Total" value={toBRL(convoBilling.total)} />
                  <StatCard label="Mensagens" value={String(convoBilling.count)} />
                </div>
                {Object.keys(convoBilling.byCategory).length > 0 && (
                  <div className="space-y-1">
                    {Object.entries(convoBilling.byCategory).map(([cat, data]) => (
                      <div key={cat} className="flex items-center justify-between text-[11px]">
                        <span className={cn("font-medium", CATEGORY_COLORS[cat] || CATEGORY_COLORS.unknown)}>
                          {CATEGORY_LABELS[cat] || cat}
                        </span>
                        <span className="text-muted-foreground/60">
                          {data.count}× · {toBRL(data.cost)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Today */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground/70 flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Hoje
              </h4>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground/70">{toBRL(todayTotal)}</span>
                  <span className="text-muted-foreground/40">limite: {toBRL(dailyLimit)}</span>
                </div>
                <Progress value={dayPct} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground/40">
                  {monthly?.todayCount ?? 0} conversas cobradas
                </p>
              </div>
            </div>

            {/* Month */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground/70 flex items-center gap-1.5">
                <Calendar className="h-3 w-3" /> Mês atual
              </h4>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground/70">{toBRL(monthTotal)}</span>
                  <span className="text-muted-foreground/40">limite: {toBRL(monthLimit)}</span>
                </div>
                <Progress value={monthPct} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground/40">
                  {monthly?.monthCount ?? 0} conversas cobradas
                </p>
              </div>

              {/* Category breakdown */}
              {monthly?.byCategory && Object.keys(monthly.byCategory).length > 0 && (
                <div className="mt-2 space-y-1 p-2.5 rounded-lg bg-muted/5 border border-border/5">
                  <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-1">Por categoria</p>
                  {Object.entries(monthly.byCategory).map(([cat, data]) => (
                    <div key={cat} className="flex items-center justify-between text-[11px]">
                      <span className={cn("font-medium", CATEGORY_COLORS[cat] || CATEGORY_COLORS.unknown)}>
                        {CATEGORY_LABELS[cat] || cat}
                      </span>
                      <span className="text-muted-foreground/60">
                        {data.count}× · {toBRL(data.cost)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rate card reference */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground/70 flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3" /> Tabela de preços (Brasil)
              </h4>
              <div className="space-y-1 text-[11px]">
                {rateCards.map((rc, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className={cn("font-medium", CATEGORY_COLORS[rc.category] || "text-muted-foreground")}>
                      {CATEGORY_LABELS[rc.category] || rc.category}
                      <span className="text-muted-foreground/40 font-normal ml-1">({rc.direction === "user_initiated" ? "user" : "business"})</span>
                    </span>
                    <span className="font-mono text-muted-foreground/70">{toBRL(rc.cost_per_message)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-muted/5 border border-border/5 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground/50">{label}</p>
    </div>
  );
}
