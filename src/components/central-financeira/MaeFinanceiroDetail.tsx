import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CentralFinanceiraDialog } from "@/components/central-financeira/CentralFinanceiraDialog";
import { PagamentoDialog } from "@/components/pagamentos/PagamentoDialog";
import { PagamentoDetailDrawer, StatusGeralBadge } from "@/components/pagamentos/PagamentoDetailDrawer";
import { useCentralFinanceira } from "@/hooks/useCentralFinanceira";
import { calcularStatusGeral } from "@/lib/pagamentoUtils";
import { formatCpf } from "@/lib/formatters";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MaeProcesso } from "@/types/mae";
import {
  Wallet,
  Receipt,
  Landmark,
  FileText,
  ClipboardList,
  Edit,
  Plus,
  Eye,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface Props {
  mae: MaeProcesso;
}

const brl = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  try {
    return format(parseISO(d.length === 10 ? d : d.substring(0, 10)), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return d;
  }
};

type TabKey = "resumo" | "honorarios" | "central";

const TAB_OPTIONS: { value: TabKey; label: string; icon: any }[] = [
  { value: "resumo", label: "Resumo", icon: ClipboardList },
  { value: "honorarios", label: "Honorários da Amor", icon: Receipt },
  { value: "central", label: "Benefício & Boletos", icon: Landmark },
];

async function fetchPagamentoDaMae(maeId: string) {
  const { data: pag } = await supabase
    .from("pagamentos_mae")
    .select("*")
    .eq("mae_id", maeId)
    .maybeSingle();

  if (!pag) return null;

  const { data: parcelas } = await supabase
    .from("parcelas_pagamento")
    .select("*")
    .eq("pagamento_id", pag.id)
    .order("numero_parcela", { ascending: true });

  return { pagamento: pag, parcelas: parcelas ?? [] };
}

export function MaeFinanceiroDetail({ mae }: Props) {
  const [tab, setTab] = useState<TabKey>("resumo");
  const [pagamentoDialogOpen, setPagamentoDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useIsMobile();
  const qc = useQueryClient();

  const pagQuery = useQuery({
    queryKey: ["mae-pagamento", mae.id],
    queryFn: () => fetchPagamentoDaMae(mae.id),
    enabled: !!mae.id,
  });

  const refetchPag = () => {
    qc.invalidateQueries({ queryKey: ["mae-pagamento", mae.id] });
    qc.invalidateQueries({ queryKey: ["pagamentos_tab_data"] });
    qc.invalidateQueries({ queryKey: ["pagamentos"] });
  };

  const { central, parcelas: parcelasBeneficio, boletos } = useCentralFinanceira(mae.id);

  const honorariosResumo = useMemo(() => {
    const parcelas = pagQuery.data?.parcelas ?? [];
    const total = pagQuery.data?.pagamento?.valor_total ?? 0;
    const pagas = parcelas.filter((p) => p.status === "pago");
    const recebido = pagas.reduce((s, p) => s + Number(p.valor ?? 0), 0);
    const emAberto = parcelas
      .filter((p) => p.status !== "pago")
      .reduce((s, p) => s + Number(p.valor ?? 0), 0);
    const inadimplentes = parcelas.filter((p) => p.status === "inadimplente").length;
    const proxima = parcelas
      .filter((p) => p.status !== "pago" && p.data_pagamento)
      .sort((a, b) => (a.data_pagamento! < b.data_pagamento! ? -1 : 1))[0];
    return {
      total,
      recebido,
      emAberto,
      inadimplentes,
      progresso: parcelas.length > 0 ? (pagas.length / parcelas.length) * 100 : 0,
      qtdPagas: pagas.length,
      qtdTotal: parcelas.length,
      proximaData: proxima?.data_pagamento ?? null,
      proximoValor: proxima?.valor ?? null,
    };
  }, [pagQuery.data]);

  const beneficioResumo = useMemo(() => {
    const total = parcelasBeneficio.reduce((s, p) => s + Number(p.valor ?? 0), 0);
    const liberado = parcelasBeneficio
      .filter((p) => p.status === "liberada" || p.status === "recebida")
      .reduce((s, p) => s + Number(p.valor ?? 0), 0);
    const totalBoletos = boletos.reduce((s, b) => s + Number(b.valor ?? 0), 0);
    const boletosPagos = boletos.filter((b) => b.status === "pago").reduce((s, b) => s + Number(b.valor ?? 0), 0);
    return {
      total,
      liberado,
      futuro: total - liberado,
      totalBoletos,
      boletosPagos,
      boletosAberto: totalBoletos - boletosPagos,
    };
  }, [parcelasBeneficio, boletos]);

  const drawerPagamento = useMemo(() => {
    if (!pagQuery.data?.pagamento) return null;
    const p = pagQuery.data.pagamento;
    return {
      id: p.id,
      mae_id: p.mae_id,
      user_id: p.user_id,
      mae_nome: mae.nome_mae,
      mae_cpf: mae.cpf ?? "",
      tipo_pagamento: p.tipo_pagamento,
      total_parcelas: p.total_parcelas ?? 0,
      valor_total: p.valor_total,
      percentual_comissao: p.percentual_comissao,
      parcelas: (pagQuery.data.parcelas ?? []).map((parcela: any) => ({
        id: parcela.id,
        numero_parcela: parcela.numero_parcela,
        data_pagamento: parcela.data_pagamento,
        status: parcela.status,
        observacoes: parcela.observacoes,
        valor: parcela.valor,
        valor_comissao: parcela.valor_comissao,
      })),
    };
  }, [pagQuery.data, mae]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-primary/20">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold truncate">{mae.nome_mae}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{mae.cpf ? formatCpf(mae.cpf) : "—"}</span>
              <Badge variant="outline" className="text-[10px]">
                {mae.status_processo}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab navigation: Select on mobile, Tabs on desktop */}
      {isMobile ? (
        <Select value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[100]">
            {TAB_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                <div className="flex items-center gap-2">
                  <o.icon className="h-4 w-4" />
                  {o.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        {!isMobile && (
          <TabsList>
            {TAB_OPTIONS.map((o) => (
              <TabsTrigger key={o.value} value={o.value} className="gap-1.5">
                <o.icon className="h-3.5 w-3.5" />
                {o.label}
              </TabsTrigger>
            ))}
          </TabsList>
        )}

        {/* RESUMO */}
        <TabsContent value="resumo" className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {/* Honorários card */}
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    Honorários da Amor
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setTab("honorarios")}
                    className="text-xs h-7"
                  >
                    Abrir
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {pagQuery.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : !pagQuery.data ? (
                  <p className="text-muted-foreground text-xs">Sem pagamento cadastrado ainda.</p>
                ) : (
                  <>
                    <Row label="Total contratado" value={brl(honorariosResumo.total)} />
                    <Row label="Recebido" value={brl(honorariosResumo.recebido)} positive />
                    <Row label="Em aberto" value={brl(honorariosResumo.emAberto)} warning={honorariosResumo.emAberto > 0} />
                    <div className="pt-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{honorariosResumo.qtdPagas}/{honorariosResumo.qtdTotal} parcelas</span>
                        <Progress value={honorariosResumo.progresso} className="h-1.5 flex-1" />
                      </div>
                    </div>
                    {honorariosResumo.proximaData && (
                      <p className="text-xs text-muted-foreground pt-1">
                        Próxima: {brl(honorariosResumo.proximoValor)} em {fmtDate(honorariosResumo.proximaData)}
                      </p>
                    )}
                    {honorariosResumo.inadimplentes > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {honorariosResumo.inadimplentes} inadimplente(s)
                      </Badge>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Benefício card */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-blue-500" />
                    Benefício INSS & Boletos
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setTab("central")}
                    className="text-xs h-7"
                  >
                    Abrir
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Total previsto do benefício" value={brl(beneficioResumo.total)} />
                <Row label="Já liberado" value={brl(beneficioResumo.liberado)} positive />
                <Row label="Futuro previsto" value={brl(beneficioResumo.futuro)} />
                <div className="border-t pt-2 mt-2 space-y-1">
                  <Row label="Total boletos" value={brl(beneficioResumo.totalBoletos)} />
                  <Row label="Pagos" value={brl(beneficioResumo.boletosPagos)} positive />
                  <Row
                    label="Em aberto"
                    value={brl(beneficioResumo.boletosAberto)}
                    warning={beneficioResumo.boletosAberto > 0}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* HONORÁRIOS */}
        <TabsContent value="honorarios" className="mt-4 space-y-4">
          {pagQuery.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !pagQuery.data ? (
            <Card>
              <CardContent className="py-12 text-center space-y-3">
                <Receipt className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Nenhum pagamento de honorários cadastrado para esta mãe.
                </p>
                <Button onClick={() => setPagamentoDialogOpen(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Cadastrar pagamento
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary bar */}
              <Card>
                <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <Stat label="Total contratado" value={brl(honorariosResumo.total)} />
                  <Stat label="Recebido" value={brl(honorariosResumo.recebido)} accent="success" />
                  <Stat label="Em aberto" value={brl(honorariosResumo.emAberto)} accent="warning" />
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setDrawerOpen(true)} className="gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      Ver detalhes
                    </Button>
                    <Button size="sm" onClick={() => setPagamentoDialogOpen(true)} className="gap-1">
                      <Edit className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Parcelas inline */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" />
                    Parcelas
                    <Badge variant="outline" className="ml-auto text-xs">
                      <StatusGeralBadge
                        status={calcularStatusGeral(mae.nome_mae, drawerPagamento?.parcelas ?? [])}
                      />
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(pagQuery.data.parcelas ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma parcela cadastrada.</p>
                  )}
                  {(pagQuery.data.parcelas ?? []).map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between border rounded p-2 text-sm gap-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-semibold w-8 shrink-0">#{p.numero_parcela}</span>
                        <div className="min-w-0">
                          <div className="font-medium">{brl(p.valor)}</div>
                          <div className="text-xs text-muted-foreground">{fmtDate(p.data_pagamento)}</div>
                        </div>
                      </div>
                      <ParcelaStatusBadge status={p.status} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}

          <PagamentoDialog
            open={pagamentoDialogOpen}
            onOpenChange={setPagamentoDialogOpen}
            maeId={mae.id}
            maeNome={mae.nome_mae}
            existingPagamentoId={pagQuery.data?.pagamento?.id}
            onSuccess={refetchPag}
          />

          <PagamentoDetailDrawer
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
            pagamento={drawerPagamento as any}
            onUpdated={refetchPag}
          />
        </TabsContent>

        {/* CENTRAL — Benefício & Boletos & Comunicado */}
        <TabsContent value="central" className="mt-4">
          <CentralFinanceiraDialog mae={mae} inline />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({
  label,
  value,
  positive,
  warning,
}: {
  label: string;
  value: string;
  positive?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span
        className={`font-semibold tabular-nums ${
          positive ? "text-emerald-600" : warning ? "text-amber-600" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "success" | "warning";
}) {
  const color =
    accent === "success"
      ? "text-emerald-600"
      : accent === "warning"
      ? "text-amber-600"
      : "";
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function ParcelaStatusBadge({ status }: { status: string }) {
  if (status === "pago")
    return (
      <Badge className="bg-emerald-500/20 text-emerald-700 text-xs">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Pago
      </Badge>
    );
  if (status === "inadimplente")
    return (
      <Badge variant="destructive" className="text-xs">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Inadimplente
      </Badge>
    );
  return (
    <Badge variant="secondary" className="text-xs">
      <Clock className="h-3 w-3 mr-1" />
      Pendente
    </Badge>
  );
}
