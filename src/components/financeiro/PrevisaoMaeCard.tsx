import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, TrendingUp, AlertTriangle } from "lucide-react";
import { format, parseISO, isBefore, isAfter, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PagamentoComMae } from "@/hooks/usePagamentos";

interface PrevisaoMaeCardProps {
  pagamentos: PagamentoComMae[];
}

interface ParcelaPrevisao {
  maeNome: string;
  maeCpf: string;
  numeroParcela: number;
  totalParcelas: number;
  dataVencimento: string;
  valor: number;
  status: string;
  diasAtraso?: number;
}

export function PrevisaoMaeCard({ pagamentos }: PrevisaoMaeCardProps) {
  const previsoes = useMemo(() => {
    const now = new Date();
    const proximos30Dias = addDays(now, 30);
    const items: ParcelaPrevisao[] = [];

    pagamentos.forEach((pag) => {
      pag.parcelas.forEach((p) => {
        if (p.status !== "pendente" && p.status !== "inadimplente") return;
        if (!p.data_pagamento) return;

        try {
          const dataVencimento = parseISO(p.data_pagamento);
          
          // Show parcelas vencidas (últimos 60 dias) ou próximas (30 dias)
          const isVencida = isBefore(dataVencimento, now);
          const isProxima = isAfter(dataVencimento, now) && isBefore(dataVencimento, proximos30Dias);
          
          if (isVencida || isProxima) {
            const diasAtraso = isVencida 
              ? Math.floor((now.getTime() - dataVencimento.getTime()) / (1000 * 60 * 60 * 24))
              : undefined;

            items.push({
              maeNome: pag.mae_nome,
              maeCpf: pag.mae_cpf,
              numeroParcela: p.numero_parcela,
              totalParcelas: pag.total_parcelas,
              dataVencimento: p.data_pagamento,
              valor: p.valor_comissao || 0,
              status: p.status,
              diasAtraso,
            });
          }
        } catch {
          // Skip invalid dates
        }
      });
    });

    // Sort: atrasadas primeiro, depois por data
    return items.sort((a, b) => {
      if (a.diasAtraso && !b.diasAtraso) return -1;
      if (!a.diasAtraso && b.diasAtraso) return 1;
      return new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime();
    });
  }, [pagamentos]);

  const totalPrevisto = useMemo(() => {
    return previsoes.reduce((acc, p) => acc + p.valor, 0);
  }, [previsoes]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Previsão por Mãe
          </CardTitle>
          <Badge variant="secondary" className="font-mono">
            {formatCurrency(totalPrevisto)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64 md:h-80 px-4 pb-4">
          {previsoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma parcela prevista
            </div>
          ) : (
            <div className="space-y-2">
              {previsoes.map((p, idx) => (
                <div
                  key={`${p.maeCpf}-${p.numeroParcela}-${idx}`}
                  className={`flex items-center justify-between p-2 rounded-lg border ${
                    p.diasAtraso ? "border-destructive/50 bg-destructive/5" : "border-border"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.maeNome}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Parcela {p.numeroParcela}/{p.totalParcelas}</span>
                      <span>•</span>
                      <span>{formatDate(p.dataVencimento)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.diasAtraso ? (
                      <Badge variant="destructive" className="text-[10px]">
                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                        {p.diasAtraso}d
                      </Badge>
                    ) : (
                      <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    )}
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrency(p.valor)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
