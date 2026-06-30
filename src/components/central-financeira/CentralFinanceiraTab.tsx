import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  Landmark,
  Receipt,
  ChevronDown,
} from "lucide-react";
import { MaeFinanceiroDetail } from "@/components/central-financeira/MaeFinanceiroDetail";
import { BancosDialog } from "@/components/pagamentos/BancosDialog";
import { useAuth } from "@/hooks/useAuth";
import { formatCpf } from "@/lib/formatters";
import { format, getMonth, getYear, parseISO } from "date-fns";
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
}

async function fetchFinanceiroData() {
  const [maesResult, pagamentosResult, centralResult, boletosResult] = await Promise.all([
    supabase
      .from("mae_processo")
      .select("*")
      .in("status_processo", ["✅ Aprovada", "📄 Rescisão de Contrato"])
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

  // Parcelas in one query
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

  const pagamentoPorMae = new Map<string, { pagamento: any; parcelas: any[] }>();
  pagamentosData.forEach((pag) => {
    pagamentoPorMae.set(pag.mae_id, { pagamento: pag, parcelas: parcelasMap.get(pag.id) ?? [] });
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
      parcelasInadimplentes = 0;

    parcelas.forEach((p) => {
      const v = Number(p.valor ?? 0);
      valorTotal += v;
      if (p.status === "pago") {
        parcelasPagas++;
        valorRecebido += v;
      } else if (p.status === "inadimplente") {
        parcelasInadimplentes++;
        valorPendente += v;
      } else {
        parcelasPendentes++;
        valorPendente += v;
      }
    });

    return {
      mae,
      hasPagamento: !!pagInfo,
      parcelasTotal: parcelas.length,
      parcelasPagas,
      parcelasPendentes,
      parcelasInadimplentes,
      valorTotal: pagInfo?.pagamento.valor_total ?? valorTotal,
      valorRecebido,
      valorPendente,
      parcelas,
      hasBeneficio: !!centralId,
      totalBoletos: boletosInfo?.total ?? 0,
      boletosPagos: boletosInfo?.pago ?? 0,
    };
  });

  return { rows };
}

export function CentralFinanceiraTab({ searchQuery, selectedUserId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMae, setSelectedMae] = useState<MaeProcesso | null>(null);
  const [localSearch, setLocalSearch] = useState("");
  const [bancosOpen, setBancosOpen] = useState(false);

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(currentDate));
  const [selectedYear, setSelectedYear] = useState<number>(getYear(currentDate));
  const [mesOpen, setMesOpen] = useState(false);

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

  // Filter by user
  const userFilteredRows = useMemo(() => {
    if (!selectedUserId || selectedUserId === "all") return rows;
    return rows.filter((r) => r.mae.user_id === selectedUserId);
  }, [rows, selectedUserId]);

  // KPIs
  const stats = useMemo(() => {
    let totalParcelas = 0,
      pagas = 0,
      pendentes = 0,
      inadimplentes = 0;
    let valorTotal = 0,
      valorPago = 0,
      valorPendente = 0,
      valorMes = 0;

    userFilteredRows.forEach((r) => {
      totalParcelas += r.parcelasTotal;
      pagas += r.parcelasPagas;
      pendentes += r.parcelasPendentes;
      inadimplentes += r.parcelasInadimplentes;
      valorTotal += r.parcelas.reduce((s, p) => s + Number(p.valor ?? 0), 0);
      r.parcelas.forEach((p) => {
        const v = Number(p.valor ?? 0);
        if (p.status === "pago") {
          valorPago += v;
          if (p.data_pagamento) {
            try {
              const dp = parseISO(p.data_pagamento);
              if (getMonth(dp) === selectedMonth && getYear(dp) === selectedYear) valorMes += v;
            } catch {}
          }
        } else {
          valorPendente += v;
        }
      });
    });

    return {
      totalMaes: userFilteredRows.length,
      totalParcelas,
      pagas,
      pendentes,
      inadimplentes,
      valorTotal,
      valorPago,
      valorPendente,
      valorMes,
    };
  }, [userFilteredRows, selectedMonth, selectedYear]);

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
    // Sort: inadimplente > pendente > sem cadastro > pago
    return [...list].sort((a, b) => {
      const score = (r: MaeFinanceiroRow) => {
        if (r.parcelasInadimplentes > 0) return 0;
        if (!r.hasPagamento) return 1;
        if (r.parcelasPendentes > 0) return 2;
        return 3;
      };
      return score(a) - score(b);
    });
  }, [userFilteredRows, localSearch, searchQuery]);

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
      {/* KPIs de quantidade */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Mães</CardTitle>
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.totalMaes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Total Parcelas</CardTitle>
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.totalParcelas}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Pagas</CardTitle>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-600">{stats.pagas}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Pendentes</CardTitle>
            <Clock className="h-3.5 w-3.5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-amber-600">{stats.pendentes}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium">Inadimplentes</CardTitle>
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-destructive">{stats.inadimplentes}</div>
          </CardContent>
        </Card>
      </div>

      {/* KPIs de valor */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium">Valor Total Contratado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{brl(stats.valorTotal)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium">Recebido (Total)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-emerald-600">{brl(stats.valorPago)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium">A Receber</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-amber-600">{brl(stats.valorPendente)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Recebido em {meses[selectedMonth]}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-lg font-bold text-blue-600">{brl(stats.valorMes)}</div>
            <div className="flex gap-1">
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {meses.map((m, i) => (
                    <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="h-7 text-xs w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {anos.map((a) => (
                    <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Lista de mães */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredRows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma mãe encontrada
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRows.map((r) => (
            <Card
              key={r.mae.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedMae(r.mae)}
            >
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm truncate">{r.mae.nome_mae}</h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      {r.mae.cpf ? formatCpf(r.mae.cpf) : "—"}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {r.mae.status_processo}
                  </Badge>
                </div>

                {/* Honorários badge */}
                <div className="flex items-center gap-1.5 text-xs">
                  <Receipt className="h-3 w-3 text-primary" />
                  <span className="text-muted-foreground">Honorários:</span>
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
                    <Badge variant="secondary" className="text-[10px]">Sem parcelas</Badge>
                  )}
                </div>

                {/* Benefício badge */}
                <div className="flex items-center gap-1.5 text-xs">
                  <Landmark className="h-3 w-3 text-blue-500" />
                  <span className="text-muted-foreground">Benefício:</span>
                  {!r.hasBeneficio ? (
                    <Badge variant="secondary" className="text-[10px]">Sem cadastro</Badge>
                  ) : r.totalBoletos === 0 ? (
                    <Badge variant="outline" className="text-[10px]">Em projeção</Badge>
                  ) : r.boletosPagos >= r.totalBoletos ? (
                    <Badge className="bg-emerald-500/20 text-emerald-700 text-[10px]">Boletos pagos</Badge>
                  ) : (
                    <Badge className="bg-blue-500/20 text-blue-700 text-[10px]">
                      {brl(r.totalBoletos - r.boletosPagos)} em aberto
                    </Badge>
                  )}
                </div>

                {r.hasPagamento && r.valorTotal > 0 && (
                  <div className="text-xs text-muted-foreground pt-1 border-t flex items-center justify-between">
                    <span>Total: {brl(r.valorTotal)}</span>
                    {r.valorRecebido > 0 && (
                      <span className="text-emerald-600">{brl(r.valorRecebido)} pago</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BancosDialog open={bancosOpen} onOpenChange={setBancosOpen} />
    </div>
  );
}
