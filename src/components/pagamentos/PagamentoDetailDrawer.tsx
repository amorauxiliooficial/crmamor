import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCpf } from "@/lib/formatters";
import { processarComissaoParcela } from "@/lib/comissaoUtils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Link2,
  Loader2,
  Copy,
  DollarSign,
} from "lucide-react";
import type { StatusGeral, ParcelaResumo } from "@/lib/pagamentoUtils";
import { calcularStatusGeral } from "@/lib/pagamentoUtils";

interface PagamentoDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagamento: {
    id: string;
    mae_id: string;
    user_id?: string;
    mae_nome: string;
    mae_cpf: string;
    tipo_pagamento: string;
    total_parcelas: number;
    valor_total: number | null;
    percentual_comissao?: number | null;
    parcelas: ParcelaResumo[];
  } | null;
  onUpdated: () => void;
}

function StatusGeralBadge({ status }: { status: StatusGeral }) {
  switch (status) {
    case "pago":
      return (
        <Badge className="bg-primary/20 text-primary">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Pago
        </Badge>
      );
    case "inadimplente":
      return (
        <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Inadimplente
        </Badge>
      );
    case "vinculo_pendente":
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-600">
          <Link2 className="h-3 w-3 mr-1" />
          Vínculo pendente
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Pendente
        </Badge>
      );
  }
}

function ParcelaStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pago":
      return <Badge className="bg-primary/20 text-primary text-[10px]">Pago</Badge>;
    case "inadimplente":
      return <Badge variant="destructive" className="text-[10px]">Inadimplente</Badge>;
    default:
      return <Badge variant="secondary" className="text-[10px]">Pendente</Badge>;
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function DrawerBody({
  pagamento,
  onUpdated,
  onClose,
}: {
  pagamento: NonNullable<PagamentoDetailDrawerProps["pagamento"]>;
  onUpdated: () => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [savingParcelaId, setSavingParcelaId] = useState<string | null>(null);
  const [valorAReceber, setValorAReceber] = useState("");
  const [copiedCpf, setCopiedCpf] = useState(false);

  const statusGeral = calcularStatusGeral(pagamento.mae_nome, pagamento.parcelas);
  const parcelasPagas = pagamento.parcelas.filter((p) => p.status === "pago").length;
  const totalParcelas = pagamento.parcelas.length;
  const progresso = totalParcelas > 0 ? (parcelasPagas / totalParcelas) * 100 : 0;

  const handleRegistrarPagamento = async (parcela: ParcelaResumo) => {
    setSavingParcelaId(parcela.id);
    const hoje = new Date().toISOString().split("T")[0];
    const { error } = await supabase
      .from("parcelas_pagamento")
      .update({
        status: "pago",
        data_pagamento: parcela.data_pagamento || hoje,
      })
      .eq("id", parcela.id);

    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } else {
      // Auto-calculate commission and create despesa
      try {
        if (parcela.valor && parcela.valor > 0) {
          await processarComissaoParcela({
            parcelaId: parcela.id,
            valorParcela: parcela.valor,
            userId: pagamento.user_id || "",
            maeNome: pagamento.mae_nome,
            numeroParcela: parcela.numero_parcela,
          });
        }
      } catch (err) {
        console.error("Erro ao processar comissão:", err);
      }
      toast({ title: "Parcela registrada como paga", description: parcela.valor ? `Comissão de 10% (${formatCurrency(parcela.valor * 0.1)}) programada para dia 5` : undefined });
      onUpdated();
    }
    setSavingParcelaId(null);
  };

  const copyCpf = () => {
    navigator.clipboard.writeText(pagamento.mae_cpf.replace(/\D/g, ""));
    setCopiedCpf(true);
    setTimeout(() => setCopiedCpf(false), 1500);
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4 md:px-6">
        {/* Header info */}
        <div className="space-y-3 py-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-lg">{pagamento.mae_nome}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm text-muted-foreground font-mono">{formatCpf(pagamento.mae_cpf)}</span>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={copyCpf}>
                  <Copy className="h-3 w-3" />
                </Button>
                {copiedCpf && <span className="text-[10px] text-primary">Copiado</span>}
              </div>
            </div>
            <StatusGeralBadge status={statusGeral} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {pagamento.tipo_pagamento === "a_vista" ? "À Vista" : `Parcelado ${pagamento.total_parcelas}x`}
            </Badge>
            {pagamento.valor_total && (
              <Badge variant="secondary">Total: {formatCurrency(pagamento.valor_total)}</Badge>
            )}
            {pagamento.percentual_comissao && (
              <Badge variant="secondary">Comissão: {pagamento.percentual_comissao}%</Badge>
            )}
          </div>

          {/* Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{parcelasPagas}/{totalParcelas}</span>
            </div>
            <Progress value={progresso} className="h-2" />
          </div>
        </div>

        <Separator />

        {/* Parcelas */}
        <div className="py-4 space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Parcelas</h4>
          {pagamento.parcelas.map((parcela) => (
            <div key={parcela.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{parcela.numero_parcela}ª Parcela</span>
                <ParcelaStatusBadge status={parcela.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Valor</span>
                  <p className="font-medium">{parcela.valor ? formatCurrency(parcela.valor) : "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">
                    {parcela.status === "pago" ? "Pago em" : "Vencimento"}
                  </span>
                  <p className="font-medium">{formatDate(parcela.data_pagamento)}</p>
                </div>
              </div>
              {parcela.observacoes && (
                <p className="text-xs text-muted-foreground">{parcela.observacoes}</p>
              )}
              {parcela.status !== "pago" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={savingParcelaId === parcela.id}
                  onClick={() => handleRegistrarPagamento(parcela)}
                >
                  {savingParcelaId === parcela.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <DollarSign className="h-3.5 w-3.5 mr-1" />
                  )}
                  Registrar pagamento
                </Button>
              )}
            </div>
          ))}
        </div>

        <Separator />

        {/* Conferência */}
        <div className="py-4 space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Conferência</h4>
          <div className="space-y-1.5">
            <Label className="text-xs">Valor a receber (conferência)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="Apenas para conferência, não afeta KPIs"
              value={valorAReceber}
              onChange={(e) => setValorAReceber(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Este valor é apenas para conferência interna. Não afeta relatórios ou totais.
            </p>
          </div>
        </div>
      </ScrollArea>

      <div className="border-t p-4 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
}

export function PagamentoDetailDrawer({
  open,
  onOpenChange,
  pagamento,
  onUpdated,
}: PagamentoDetailDrawerProps) {
  const isMobile = useIsMobile();

  if (!pagamento) return null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="pb-0">
            <DrawerTitle>Detalhes do Pagamento</DrawerTitle>
            <DrawerDescription className="sr-only">Detalhes e parcelas do pagamento</DrawerDescription>
          </DrawerHeader>
          <DrawerBody
            pagamento={pagamento}
            onUpdated={onUpdated}
            onClose={() => onOpenChange(false)}
          />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:w-[480px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle>Detalhes do Pagamento</SheetTitle>
          <SheetDescription className="sr-only">Detalhes e parcelas do pagamento</SheetDescription>
        </SheetHeader>
        <DrawerBody
          pagamento={pagamento}
          onUpdated={onUpdated}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

export { StatusGeralBadge };
