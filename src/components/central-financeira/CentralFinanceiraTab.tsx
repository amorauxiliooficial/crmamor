import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  Search,
  Loader2,
  ArrowLeft,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  MessageCircle,
  ExternalLink,
  Flame,
} from "lucide-react";
import { MaeFinanceiroDetail } from "@/components/central-financeira/MaeFinanceiroDetail";
import { BancosDialog } from "@/components/pagamentos/BancosDialog";
import { useAuth } from "@/hooks/useAuth";
import { formatCpf } from "@/lib/formatters";
import { differenceInDays, format, getMonth, getYear, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MaeProcesso } from "@/types/mae";

interface Props {
  searchQuery: string;
  selectedUserId?: string;
}

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface MaeFinanceiroRow {
  mae: MaeProcesso;
  hasPagamento: boolean;
  parcelasTotal: number;
  parcelasPagas: number;
  parcelasPendentes: number;
  parcelasInadimplentes: number;
  valorTotal: number;
  valorRecebido: number;
  valorPendente: number;
  parcelas: any[];
  hasBeneficio: boolean;
  totalBoletos: number;
  boletosPagos: number;
  // Aging fields
  valorEmAtraso: number;
  parcelasEmAtraso: any[];
  maiorAtrasoDias: number;
  proximoVencimento: string | null;
}

async function fetchFinanceiroData() {
  const [maesResult, pagamentosResult, centralResult, boletosResult] = await Promise.all([
    supabase
      .from("mae_processo")
      .select("*")
      .in("status_processo", [
        "Aprovada",
        "📄 Rescisão de Contrato",
        "Renegociação",
        "Inadimplência",
        "Negativação",
      ])
      .order("nome_mae", { ascending: true }),
    supabase.from("pagamentos_mae").select("*").order("created_at", { ascending: false }),
    supabase.from("central_financeira" as any).select("id, mae_id"),
    supabase.from("boletos_amor" as any).select("central_id, valor, status"),
  ]);

  if (maesResult.error) throw maesResult.error;
  if (pagamentosResult.error) throw pagamentosResult.error;

  const maesAprovadas = (maesResult.data ?? []) as MaeProcesso[];
  const pagamentosData = pagamentosResult.data ?? [];
  const centralData = (centralResult.data ?? []) as any[];
  const boletosData = (boletosResult.data ?? []) as any[];

  const pagamentoIds = pagamentosData.map((p) => p.id);
  const { data: todasParcelas } = pagamentoIds.length
    ? await supabase
        .from("parcelas_pagamento")
        .select("*")
        .in("pagamento_id", pagamentoIds)
        .order("numero_parcela", { ascending: true })
    : { data: [] as any[] };

  const parcelasMap = new Map<string, any[]>();
  (todasParcelas ?? []).forEach((p: any) => {
    if (!parcelasMap.has(p.pagamento_id)) parcelasMap.set(p.pagamento_id, []);
    parcelasMap.get(p.pagamento_id)!.push(p);
  });

  // Aggregate all pagamentos per mae (a mother may have multiple contracts)
  const pagamentoPorMae = new Map<string, { pagamentos: any[]; parcelas: any[] }>();
  pagamentosData.forEach((pag) => {
    const cur = pagamentoPorMae.get(pag.mae_id) ?? { pagamentos: [], parcelas: [] };
    cur.pagamentos.push(pag);
    cur.parcelas.push(...(parcelasMap.get(pag.id) ?? []));
    pagamentoPorMae.set(pag.mae_id, cur);
  });

  const centralPorMae = new Map<string, string>();
  centralData.forEach((c) => centralPorMae.set(c.mae_id, c.id));

  const boletosPorCentral = new Map<string, { total: number; pago: number }>();
  boletosData.forEach((b) => {
    const cur = boletosPorCentral.get(b.central_id) ?? { total: 0, pago: 0 };
    cur.total += Number(b.valor ?? 0);
    if (b.status === "pago") cur.pago += Number(b.valor ?? 0);
    boletosPorCentral.set(b.central_id, cur);
  });

  const hoje = startOfDay(new Date());

  const rows: MaeFinanceiroRow[] = maesAprovadas.map((mae) => {
    const pagInfo = pagamentoPorMae.get(mae.id);
    const parcelas = pagInfo?.parcelas ?? [];
    const centralId = centralPorMae.get(mae.id);
    const boletosInfo = centralId ? boletosPorCentral.get(centralId) : undefined;

    let valorTotal = 0,
      valorRecebido = 0,
      valorPendente = 0,
      parcelasPagas = 0,
      parcelasPendentes = 0,
      parcelasInadimplentes = 0,
      valorEmAtraso = 0,
      maiorAtrasoDias = 0;
    const parcelasEmAtraso: any[] = [];
    let proximoVencimento: string | null = null;

    parcelas.forEach((p) => {
      const v = Number(p.valor ?? 0);
      valorTotal += v;
      if (p.status === "pago") {
        parcelasPagas++;
        valorRecebido += v;
        return;
      }

      let atrasado = p.status === "inadimplente";
      let diasAtraso = 0;
      if (p.data_pagamento) {
        try {
          const dv = parseISO(p.data_pagamento);
          const diff = differenceInDays(hoje, dv);
          if (diff > 0 && p.status !== "pago") {
            atrasado = true;
            diasAtraso = diff;
          }
          if (!proximoVencimento || dv < parseISO(proximoVencimento)) {
            if (p.status !== "pago") proximoVencimento = p.data_pagamento;
          }
        } catch {}
      }

      if (atrasado) {
        parcelasInadimplentes++;
        valorEmAtraso += v;
        maiorAtrasoDias = Math.max(maiorAtrasoDias, diasAtraso);
        parcelasEmAtraso.push({ ...p, diasAtraso });
      } else {
        parcelasPendentes++;
      }
      valorPendente += v;
    });

    const valorTotalContratado =
      (pagInfo?.pagamentos ?? []).reduce((s, p) => s + Number(p.valor_total ?? 0), 0) || valorTotal;

    return {
      mae,
      hasPagamento: !!pagInfo,
      parcelasTotal: parcelas.length,
      parcelasPagas,
      parcelasPendentes,
      parcelasInadimplentes,
      valorTotal: valorTotalContratado,
      valorRecebido,
      valorPendente,
      parcelas,
      hasBeneficio: !!centralId,
      totalBoletos: boletosInfo?.total ?? 0,
      boletosPagos: boletosInfo?.pago ?? 0,
      valorEmAtraso,
      parcelasEmAtraso,
      maiorAtrasoDias,
      proximoVencimento,
    };
  });

  return { rows };
}

function agingBucket(dias: number): "1-7" | "8-30" | "31-60" | "60+" {
  if (dias <= 7) return "1-7";
  if (dias <= 30) return "8-30";
  if (dias <= 60) return "31-60";
  return "60+";
}

function openWhatsappCobranca(mae: MaeProcesso, valor: number, dias: number) {
  const raw = (mae.telefone || "").replace(/\D/g, "");
  if (!raw) return;
  const phone = raw.startsWith("55") ? raw : `55${raw}`;
  const primeiroNome = (mae.nome_mae || "").split(" ")[0];
  const msg =
    `Olá ${primeiroNome}, tudo bem?%0A%0A` +
    `Passando aqui da *Amor Auxílio Maternidade* para lembrar que consta em nosso sistema uma parcela em aberto ` +
    `no valor de *${brl(valor)}*, com ${dias} dia(s) de atraso.%0A%0A` +
    `Poderia nos confirmar a previsão de pagamento? Estamos à disposição para negociar. 💜`;
  window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
}

export function CentralFinanceiraTab({ searchQuery, selectedUserId }: Props) {
  const { user } = useAuth();
  const [selectedMae, setSelectedMae] = useState<MaeProcesso | null>(null);
  const [localSearch, setLocalSearch] = useState("");
  const [bancosOpen, setBancosOpen] = useState(false);
  const [tab, setTab] = useState<"geral" | "inadimplencia">("geral");
  const [agingFilter, setAgingFilter] = useState<"all" | "1-7" | "8-30" | "31-60" | "60+">("all");

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(currentDate));
  const [selectedYear, setSelectedYear] = useState<number>(getYear(currentDate));

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  const anos = Array.from({ length: 5 }, (_, i) => getYear(currentDate) - 2 + i);

  const { data, isLoading } = useQuery({
    queryKey: ["financeiro_unificado"],
    queryFn: fetchFinanceiroData,
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const rows = data?.rows ?? [];

  const userFilteredRows = useMemo(() => {
    if (!selectedUserId || selectedUserId === "all") return rows;
    return rows.filter((r) => r.mae.user_id === selectedUserId);
  }, [rows, selectedUserId]);

  // Search filter
  const filteredRows = useMemo(() => {
    const q = (localSearch || searchQuery || "").toLowerCase().trim();
    let list = userFilteredRows;
    if (q) {
      list = list.filter(
        (r) =>
          r.mae.nome_mae?.toLowerCase().includes(q) ||
          (r.mae.cpf ?? "").replace(/\D/g, "").includes(q.replace(/\D/g, ""))
      );
    }
    return list;
  }, [userFilteredRows, localSearch, searchQuery]);

  // Helper: mãe considerada inadimplente por STATUS (mesmo sem parcelas cadastradas)
  const isInadimplenteStatus = (statusProcesso?: string | null) => {
    const s = (statusProcesso ?? "").toLowerCase();
    return s.includes("inadimpl") || s.includes("negativ");
  };

  // ===== "A Receber": mães SEM inadimplência (nem por parcela, nem por status) =====
  const receberRows = useMemo(
    () =>
      filteredRows.filter(
        (r) => r.parcelasInadimplentes === 0 && !isInadimplenteStatus(r.mae.status_processo),
      ),
    [filteredRows],
  );

  const execRows = useMemo(() => {
    return [...receberRows].sort((a, b) => {
      const score = (r: MaeFinanceiroRow) => {
        if (!r.hasPagamento) return 0;
        if (r.parcelasPendentes > 0) return 1;
        return 2;
      };
      const sc = score(a) - score(b);
      if (sc !== 0) return sc;
      return b.valorPendente - a.valorPendente;
    });
  }, [receberRows]);

  const receberStats = useMemo(() => {
    let totalParcelas = 0, pagas = 0, pendentes = 0;
    let valorTotal = 0, valorPago = 0, valorPendente = 0, valorMes = 0;
    const maesComParcelaNoMes = new Set<string>();
    receberRows.forEach((r) => {
      r.parcelas.forEach((p) => {
        if (!p.data_pagamento) return;
        let dp: Date;
        try {
          dp = parseISO(p.data_pagamento);
        } catch { return; }
        if (getMonth(dp) !== selectedMonth || getYear(dp) !== selectedYear) return;

        const v = Number(p.valor ?? 0);
        totalParcelas++;
        valorTotal += v;
        maesComParcelaNoMes.add(r.mae.id);
        if (p.status === "pago") {
          pagas++;
          valorPago += v;
          valorMes += v;
        } else {
          pendentes++;
          valorPendente += v;
        }
      });
    });
    return {
      totalMaes: maesComParcelaNoMes.size,
      totalParcelas, pagas, pendentes,
      valorTotal, valorPago, valorPendente, valorMes,
    };
  }, [receberRows, selectedMonth, selectedYear]);

  // Inadimplência: por parcela em atraso OU por status marcado como Inadimplência/Negativação
  const inadimplenciaRowsBase = useMemo(
    () =>
      filteredRows.filter(
        (r) => r.parcelasInadimplentes > 0 || isInadimplenteStatus(r.mae.status_processo),
      ),
    [filteredRows],
  );
  const inadimplenciaRows = useMemo(() => {
    return inadimplenciaRowsBase
      .filter((r) => agingFilter === "all" || agingBucket(r.maiorAtrasoDias) === agingFilter)
      .sort((a, b) => b.maiorAtrasoDias - a.maiorAtrasoDias);
  }, [inadimplenciaRowsBase, agingFilter]);


  // Aging KPIs
  const agingStats = useMemo(() => {
    const buckets = { "1-7": 0, "8-30": 0, "31-60": 0, "60+": 0 } as Record<string, number>;
    const bucketsVal = { "1-7": 0, "8-30": 0, "31-60": 0, "60+": 0 } as Record<string, number>;
    let totalAtraso = 0;
    let maesInad = 0;
    userFilteredRows.forEach((r) => {
      const parcelasEmAtraso = r.parcelasEmAtraso ?? [];
      if (parcelasEmAtraso.length === 0) return;
      maesInad++;
      parcelasEmAtraso.forEach((p: any) => {
        const b = agingBucket(p.diasAtraso ?? 0);
        buckets[b]++;
        bucketsVal[b] += Number(p.valor ?? 0);
        totalAtraso += Number(p.valor ?? 0);
      });
    });
    return { buckets, bucketsVal, totalAtraso, maesInad };
  }, [userFilteredRows]);

  if (selectedMae) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setSelectedMae(null)} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Voltar para a lista
        </Button>
        <MaeFinanceiroDetail mae={selectedMae} />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Search + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar mãe por nome ou CPF..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Badge variant="outline">{filteredRows.length} mães</Badge>
        <Button variant="outline" size="sm" onClick={() => setBancosOpen(true)} className="gap-1.5 ml-auto">
          <Building2 className="h-4 w-4" />
          Gerenciar bancos
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList>
          <TabsTrigger value="geral" className="gap-1.5">
            A Receber
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">{receberRows.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="inadimplencia" className="gap-1.5">
            Inadimplências
            {inadimplenciaRowsBase.length > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">{inadimplenciaRowsBase.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ===== A Receber: KPIs reorganizados para leitura clara ===== */}
        <TabsContent value="geral" className="mt-3 space-y-4">
          {(() => {
            const pctRecebido = receberStats.valorTotal > 0
              ? Math.round((receberStats.valorPago / receberStats.valorTotal) * 100)
              : 0;
            const pctParcelas = receberStats.totalParcelas > 0
              ? Math.round((receberStats.pagas / receberStats.totalParcelas) * 100)
              : 0;
            return (
              <div className="grid gap-3 lg:grid-cols-3">
                {/* HERO — Recebido no mês (destaque principal) */}
                <Card className="lg:col-span-1 border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-500/5 to-transparent">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                        Entrou no caixa em {meses[selectedMonth]}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-3xl font-bold text-blue-600 tabular-nums">
                      {brl(receberStats.valorMes)}
                    </div>
                    <div className="flex gap-1.5">
                      <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="z-[100]">
                          {meses.map((m, i) => (<SelectItem key={i} value={String(i)}>{m}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                        <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                        <SelectContent className="z-[100]">
                          {anos.map((a) => (<SelectItem key={a} value={String(a)}>{a}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="pt-2 border-t flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" /> Mães ativas
                      </span>
                      <span className="font-semibold">{receberStats.totalMaes}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* GRUPO 1 — Financeiro (contratado / recebido / a receber) */}
                <Card className="lg:col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">
                      Financeiro de {meses[selectedMonth]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Previsto no mês</span>
                        <span className="text-base font-bold tabular-nums">{brl(receberStats.valorTotal)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${pctRecebido}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {pctRecebido}% recebido
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="rounded-md border-l-2 border-emerald-500 bg-emerald-500/5 px-2 py-1.5">
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Recebido
                        </div>
                        <div className="text-sm font-bold text-emerald-600 tabular-nums">
                          {brl(receberStats.valorPago)}
                        </div>
                      </div>
                      <div className="rounded-md border-l-2 border-amber-500 bg-amber-500/5 px-2 py-1.5">
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3 text-amber-500" /> A receber
                        </div>
                        <div className="text-sm font-bold text-amber-600 tabular-nums">
                          {brl(receberStats.valorPendente)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* GRUPO 2 — Parcelas (contagem) */}
                <Card className="lg:col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">
                      Parcelas de {meses[selectedMonth]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Parcelas no mês</span>
                        <span className="text-base font-bold tabular-nums">{receberStats.totalParcelas}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${pctParcelas}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {pctParcelas}% quitadas
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="rounded-md border-l-2 border-emerald-500 bg-emerald-500/5 px-2 py-1.5">
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Pagas
                        </div>
                        <div className="text-sm font-bold text-emerald-600 tabular-nums">
                          {receberStats.pagas}
                        </div>
                      </div>
                      <div className="rounded-md border-l-2 border-amber-500 bg-amber-500/5 px-2 py-1.5">
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3 text-amber-500" /> Pendentes
                        </div>
                        <div className="text-sm font-bold text-amber-600 tabular-nums">
                          {receberStats.pendentes}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}




          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : execRows.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma mãe encontrada</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr className="text-left text-xs uppercase text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Mãe</th>
                      <th className="px-3 py-2 font-medium">Honorários</th>
                      <th className="px-3 py-2 font-medium">Benefício</th>
                      <th className="px-3 py-2 font-medium text-right">Total</th>
                      <th className="px-3 py-2 font-medium text-right">Recebido</th>
                      <th className="px-3 py-2 font-medium text-right">Em aberto</th>
                      <th className="px-3 py-2 font-medium">Próx. venc.</th>
                      <th className="px-3 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {execRows.map((r) => (
                      <tr
                        key={r.mae.id}
                        className="border-b last:border-0 hover:bg-muted/40 cursor-pointer"
                        onClick={() => setSelectedMae(r.mae)}
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium truncate max-w-[200px]">{r.mae.nome_mae}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {r.mae.cpf ? formatCpf(r.mae.cpf) : "—"}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {!r.hasPagamento ? (
                            <Badge variant="secondary" className="text-[10px]">Sem cadastro</Badge>
                          ) : r.parcelasInadimplentes > 0 ? (
                            <Badge variant="destructive" className="text-[10px]">Inadimplente</Badge>
                          ) : r.parcelasPendentes > 0 && r.parcelasPagas > 0 ? (
                            <Badge className="bg-amber-500/20 text-amber-700 text-[10px]">Parcial</Badge>
                          ) : r.parcelasPendentes > 0 ? (
                            <Badge className="bg-amber-500/20 text-amber-700 text-[10px]">Pendente</Badge>
                          ) : r.parcelasPagas > 0 ? (
                            <Badge className="bg-emerald-500/20 text-emerald-700 text-[10px]">Quitado</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">—</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {!r.hasBeneficio ? (
                            <Badge variant="secondary" className="text-[10px]">Sem cadastro</Badge>
                          ) : r.totalBoletos === 0 ? (
                            <Badge variant="outline" className="text-[10px]">Em projeção</Badge>
                          ) : r.boletosPagos >= r.totalBoletos ? (
                            <Badge className="bg-emerald-500/20 text-emerald-700 text-[10px]">Quitado</Badge>
                          ) : (
                            <Badge className="bg-blue-500/20 text-blue-700 text-[10px]">
                              {brl(r.totalBoletos - r.boletosPagos)} em aberto
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{brl(r.valorTotal)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-600">{brl(r.valorRecebido)}</td>
                        <td className={`px-3 py-2 text-right tabular-nums ${r.valorEmAtraso > 0 ? "text-destructive font-medium" : "text-amber-600"}`}>
                          {brl(r.valorPendente)}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {r.proximoVencimento
                            ? format(parseISO(r.proximoVencimento), "dd/MM/yy", { locale: ptBR })
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground inline" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== Inadimplências ===== */}
        <TabsContent value="inadimplencia" className="mt-3 space-y-4">
          {/* KPIs de aging */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
            <Card className="border-l-4 border-l-destructive">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs font-medium flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5" /> Total em atraso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-destructive">{brl(agingStats.totalAtraso)}</div>
                <div className="text-[11px] text-muted-foreground">{agingStats.maesInad} mães</div>
              </CardContent>
            </Card>
            {(["1-7", "8-30", "31-60", "60+"] as const).map((b) => (
              <Card
                key={b}
                className={`cursor-pointer transition-colors ${agingFilter === b ? "border-primary" : ""}`}
                onClick={() => setAgingFilter(agingFilter === b ? "all" : b)}
              >
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-medium">{b} dias</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-base font-bold">{brl(agingStats.bucketsVal[b])}</div>
                  <div className="text-[11px] text-muted-foreground">{agingStats.buckets[b]} parcelas</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Faixa:</span>
            <Select value={agingFilter} onValueChange={(v) => setAgingFilter(v as any)}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="z-[100]">
                <SelectItem value="all">Todas as faixas</SelectItem>
                <SelectItem value="1-7">1 a 7 dias</SelectItem>
                <SelectItem value="8-30">8 a 30 dias</SelectItem>
                <SelectItem value="31-60">31 a 60 dias</SelectItem>
                <SelectItem value="60+">Mais de 60 dias</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline">{inadimplenciaRows.length} mães</Badge>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : inadimplenciaRows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                🎉 Nenhuma mãe inadimplente nesta faixa.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr className="text-left text-xs uppercase text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Mãe</th>
                      <th className="px-3 py-2 font-medium text-center">Parcelas atrasadas</th>
                      <th className="px-3 py-2 font-medium text-right">Valor em atraso</th>
                      <th className="px-3 py-2 font-medium text-center">Maior atraso</th>
                      <th className="px-3 py-2 font-medium">Faixa</th>
                      <th className="px-3 py-2 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inadimplenciaRows.map((r) => {
                      const bucket = agingBucket(r.maiorAtrasoDias);
                      const bucketColor =
                        bucket === "60+" ? "bg-destructive/20 text-destructive" :
                        bucket === "31-60" ? "bg-orange-500/20 text-orange-700" :
                        bucket === "8-30" ? "bg-amber-500/20 text-amber-700" :
                        "bg-yellow-500/20 text-yellow-700";
                      const temTelefone = !!(r.mae.telefone && r.mae.telefone.replace(/\D/g, ""));
                      return (
                        <tr key={r.mae.id} className="border-b last:border-0 hover:bg-muted/40">
                          <td className="px-3 py-2">
                            <div className="font-medium truncate max-w-[220px]">{r.mae.nome_mae}</div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {r.mae.cpf ? formatCpf(r.mae.cpf) : "—"}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Badge variant="destructive" className="text-[10px]">
                              {r.parcelasEmAtraso.length}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold text-destructive">
                            {brl(r.valorEmAtraso)}
                          </td>
                          <td className="px-3 py-2 text-center font-medium">
                            {r.maiorAtrasoDias}d
                          </td>
                          <td className="px-3 py-2">
                            <Badge className={`${bucketColor} text-[10px]`}>{bucket} dias</Badge>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 gap-1 text-xs"
                                onClick={() => setSelectedMae(r.mae)}
                              >
                                Abrir
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <BancosDialog open={bancosOpen} onOpenChange={setBancosOpen} />
    </div>
  );
}
