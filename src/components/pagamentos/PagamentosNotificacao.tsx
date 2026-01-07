import { useState, useEffect } from "react";
import { Bell, X, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, addDays, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UpcomingPayment {
  id: string;
  numero_parcela: number;
  valor: number | null;
  data_pagamento: string;
  nome_mae: string;
  total_parcelas: number | null;
}

export function PagamentosNotificacao() {
  const { user } = useAuth();
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const fetchUpcomingPayments = async () => {
    if (!user) return;

    setLoading(true);

    const today = new Date();
    const tomorrow = addDays(today, 1);
    const todayStr = format(today, "yyyy-MM-dd");
    const tomorrowStr = format(tomorrow, "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("parcelas_pagamento")
      .select(`
        id,
        numero_parcela,
        valor,
        data_pagamento,
        status,
        pagamento_id,
        pagamentos_mae!inner (
          id,
          total_parcelas,
          mae_processo!inner (
            nome_mae
          )
        )
      `)
      .in("data_pagamento", [todayStr, tomorrowStr])
      .eq("status", "pendente");

    if (error) {
      console.error("Error fetching upcoming payments:", error);
    } else if (data) {
      const payments: UpcomingPayment[] = data.map((p: any) => ({
        id: p.id,
        numero_parcela: p.numero_parcela,
        valor: p.valor,
        data_pagamento: p.data_pagamento,
        nome_mae: p.pagamentos_mae?.mae_processo?.nome_mae || "N/A",
        total_parcelas: p.pagamentos_mae?.total_parcelas,
      }));
      setUpcomingPayments(payments);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchUpcomingPayments();
    // Refresh every 5 minutes
    const interval = setInterval(fetchUpcomingPayments, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const visiblePayments = upcomingPayments.filter(
    (p) => !dismissed.includes(p.id)
  );
  const hasNotifications = visiblePayments.length > 0;

  const formatCurrency = (value: number | null) => {
    if (value === null) return "N/A";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00");
    if (isToday(date)) return "Hoje";
    if (isTomorrow(date)) return "Amanhã";
    return format(date, "dd/MM", { locale: ptBR });
  };

  const getDateBadgeVariant = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00");
    if (isToday(date)) return "destructive";
    return "secondary";
  };

  const dismissPayment = (id: string) => {
    setDismissed((prev) => [...prev, id]);
  };

  const totalValue = visiblePayments.reduce(
    (sum, p) => sum + (p.valor || 0),
    0
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notificações de pagamento"
        >
          <DollarSign className="h-5 w-5" />
          {hasNotifications && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] animate-pulse shadow-[0_0_10px_hsl(var(--destructive))]"
            >
              {visiblePayments.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="font-semibold">Pagamentos Próximos</span>
            </div>
            {hasNotifications && (
              <Badge variant="outline" className="text-xs">
                Total: {formatCurrency(totalValue)}
              </Badge>
            )}
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : visiblePayments.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum pagamento próximo
            </div>
          ) : (
            <div className="divide-y">
              {visiblePayments.map((payment) => (
                <div
                  key={payment.id}
                  className="p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getDateBadgeVariant(payment.data_pagamento)} className="text-[10px]">
                          {getDateLabel(payment.data_pagamento)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Parcela {payment.numero_parcela}
                          {payment.total_parcelas && `/${payment.total_parcelas}`}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">
                        {payment.nome_mae}
                      </p>
                      <p className="text-sm text-primary font-semibold">
                        {formatCurrency(payment.valor)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => dismissPayment(payment.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {hasNotifications && (
          <div className="p-3 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground text-center">
              <Calendar className="h-3 w-3 inline mr-1" />
              Pagamentos para hoje e amanhã
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
