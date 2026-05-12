import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  Edit,
  Trash2,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Users,
  TrendingUp,
  MoreHorizontal,
  Eye,
  Copy,
} from "lucide-react";
import { formatCpf } from "@/lib/formatters";
import { format, parseISO, getMonth, getYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PagamentoDialog } from "@/components/pagamentos/PagamentoDialog";
import { PagamentoDetailDrawer, StatusGeralBadge } from "@/components/pagamentos/PagamentoDetailDrawer";
import {
  calcularStatusGeral,
  getProximoVencimento,
  getStatusGeralOrder,
} from "@/lib/pagamentoUtils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PagamentoComMae {
  id: string;
  mae_id: string;
  tipo_pagamento: string;
  total_parcelas: number;
  valor_total: number | null;
  mae_nome: string;
  mae_cpf: string;
  user_id: string;
  parcelas: {
    id: string;
    numero_parcela: number;
    data_pagamento: string | null;
    status: string;
    observacoes: string | null;
    valor: number | null;
    valor_a_receber: number | null;
  }[];
}

interface MaeAprovada {
  id: string;
  nome_mae: string;
  cpf: string;
  temPagamento: boolean;
  pagamentoId?: string;
  user_id: string;
  statusParcelas: {
    pagas: number;
    pendentes: number;
    inadimplentes: number;
    total: number;
  };
}

interface PagamentosTabProps {
  searchQuery: string;
  selectedUserId?: string;
}

// Optimized fetch function - all queries in parallel
async function fetchPagamentosData() {
  // Run all queries in parallel
  const [maesResult, pagamentosResult] = await Promise.all([
    supabase
      .from("mae_processo")
      .select("id, nome_mae, cpf, user_id")
      .in("status_processo", ["Aprovada", "📄 Rescisão de Contrato"])
      .order("nome_mae", { ascending: true }),
    supabase
      .from("pagamentos_mae")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  if (maesResult.error) throw maesResult.error;
  if (pagamentosResult.error) throw pagamentosResult.error;

  const maesAprovadas = maesResult.data || [];
  const pagamentosData = pagamentosResult.data || [];

  // Also fetch ALL mães referenced by pagamentos (regardless of status)
  const allMaeIds = [...new Set(pagamentosData.map((p) => p.mae_id))];
  let allMaesMap = new Map<string, { id: string; nome_mae: string; cpf: string; user_id: string }>();
  
  // Add approved maes to map
  maesAprovadas.forEach((m) => allMaesMap.set(m.id, m));
  
  // Fetch any missing mães (non-Aprovada)
  const missingMaeIds = allMaeIds.filter((id) => !allMaesMap.has(id));
  if (missingMaeIds.length > 0) {
    const { data: extraMaes } = await supabase
      .from("mae_processo")
      .select("id, nome_mae, cpf, user_id")
      .in("id", missingMaeIds);
    extraMaes?.forEach((m) => allMaesMap.set(m.id, m));
  }

  if (pagamentosData.length === 0) {
    // No payments - return early with just the approved mothers
    const maesComStatus: MaeAprovada[] = maesAprovadas.map((mae) => ({
      id: mae.id,
      nome_mae: mae.nome_mae,
      cpf: mae.cpf,
      temPagamento: false,
      user_id: mae.user_id,
      statusParcelas: { pagas: 0, pendentes: 0, inadimplentes: 0, total: 0 },
    }));

    return { maesAprovadas: maesComStatus, pagamentos: [] };
  }

  // Get all pagamento IDs
  const pagamentoIds = pagamentosData.map((p) => p.id);

  // Fetch all parcelas in one query
  const { data: todasParcelas } = await supabase
    .from("parcelas_pagamento")
    .select("*")
    .in("pagamento_id", pagamentoIds)
    .order("numero_parcela", { ascending: true });

  // Create lookup maps
  const parcelasMap = new Map<string, typeof todasParcelas>();

  (todasParcelas || []).forEach((p) => {
    if (!parcelasMap.has(p.pagamento_id)) {
      parcelasMap.set(p.pagamento_id, []);
    }
    parcelasMap.get(p.pagamento_id)!.push(p);
  });

  // Build pagamentos completos
  const pagamentosCompletos: PagamentoComMae[] = pagamentosData.map((pag) => {
    const mae = allMaesMap.get(pag.mae_id);
    const parcelas = parcelasMap.get(pag.id) || [];

    return {
      id: pag.id,
      mae_id: pag.mae_id,
      tipo_pagamento: pag.tipo_pagamento,
      total_parcelas: pag.total_parcelas ?? 0,
      valor_total: pag.valor_total,
      mae_nome: mae?.nome_mae || "N/A",
      mae_cpf: mae?.cpf || "",
      user_id: mae?.user_id || "",
      parcelas: parcelas.map((p: any) => ({
        id: p.id,
        numero_parcela: p.numero_parcela,
        data_pagamento: p.data_pagamento,
        status: p.status,
        observacoes: p.observacoes,
        valor: p.valor,
        valor_a_receber: p.valor_a_receber,
      })),
    };
  });

  // Create mae payment map for status
  const maePaymentMap = new Map<string, { pagamentoId: string; parcelas: any[] }>();
  pagamentosData.forEach((pag) => {
    const parcelas = parcelasMap.get(pag.id) || [];
    maePaymentMap.set(pag.mae_id, {
      pagamentoId: pag.id,
      parcelas,
    });
  });

  // Build maes aprovadas list with payment status
  const maesComStatus: MaeAprovada[] = maesAprovadas.map((mae) => {
    const paymentInfo = maePaymentMap.get(mae.id);
    const parcelas = paymentInfo?.parcelas || [];

    const statusParcelas = {
      pagas: parcelas.filter((p: any) => p.status === "pago").length,
      pendentes: parcelas.filter((p: any) => p.status === "pendente").length,
      inadimplentes: parcelas.filter((p: any) => p.status === "inadimplente").length,
      total: parcelas.length,
    };

    return {
      id: mae.id,
      nome_mae: mae.nome_mae,
      cpf: mae.cpf,
      temPagamento: maePaymentMap.has(mae.id),
      pagamentoId: paymentInfo?.pagamentoId,
      user_id: mae.user_id,
      statusParcelas,
    };
  });

  return { maesAprovadas: maesComStatus, pagamentos: pagamentosCompletos };
}

export function PagamentosTab({ searchQuery, selectedUserId }: PagamentosTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMaeId, setSelectedMaeId] = useState<string | null>(null);
  const [selectedMaeNome, setSelectedMaeNome] = useState("");
  const [editingPagamentoId, setEditingPagamentoId] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pagamentoToDelete, setPagamentoToDelete] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPagamentoForDrawer, setSelectedPagamentoForDrawer] = useState<PagamentoComMae | null>(null);

  // Filtro de mês/ano para "Recebido"
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(currentDate));
  const [selectedYear, setSelectedYear] = useState<number>(getYear(currentDate));

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const anos = Array.from({ length: 5 }, (_, i) => getYear(currentDate) - 2 + i);

  // Use React Query with caching - prevents constant refetching
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["pagamentos_tab_data"],
    queryFn: fetchPagamentosData,
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh
    gcTime: 1000 * 60 * 10, // 10 minutes garbage collection
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Use cached data when remounting
  });

  const { maesAprovadas = [], pagamentos = [] } = data || {};

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["pagamentos_tab_data"] });
  };

  // First filter by user, then calculate stats
  const userFilteredPagamentos = useMemo(() => {
    if (!selectedUserId || selectedUserId === "all") return pagamentos;
    return pagamentos.filter((p) => p.user_id === selectedUserId);
  }, [pagamentos, selectedUserId]);

  const userFilteredMaesAprovadas = useMemo(() => {
    if (!selectedUserId || selectedUserId === "all") return maesAprovadas;
    return maesAprovadas.filter((m) => m.user_id === selectedUserId);
  }, [maesAprovadas, selectedUserId]);

  const stats = useMemo(() => {
    let totalParcelas = 0;
    let pagas = 0;
    let pendentes = 0;
    let inadimplentes = 0;
    let valorTotal = 0;
    let valorPago = 0;
    let valorPendente = 0;
    let valorMesSelecionado = 0;

    userFilteredPagamentos.forEach((pag) => {
      pag.parcelas.forEach((p) => {
        totalParcelas++;
        const valor = p.valor || 0;
        valorTotal += valor;

        if (p.status === "pago") {
          pagas++;
          valorPago += valor;
          // Verificar se foi pago no mês/ano selecionado
          if (p.data_pagamento) {
            try {
              const dataPag = parseISO(p.data_pagamento);
              if (getMonth(dataPag) === selectedMonth && getYear(dataPag) === selectedYear) {
                valorMesSelecionado += valor;
              }
            } catch {}
          }
        } else if (p.status === "pendente") {
          pendentes++;
          valorPendente += valor;
        } else if (p.status === "inadimplente") {
          inadimplentes++;
          valorPendente += valor;
        }
      });
    });

    const maesSemPagamento = userFilteredMaesAprovadas.filter((m) => !m.temPagamento).length;

    return {
      totalParcelas,
      pagas,
      pendentes,
      inadimplentes,
      maesSemPagamento,
      valorTotal,
      valorPago,
      valorPendente,
      valorMesSelecionado,
    };
  }, [userFilteredPagamentos, userFilteredMaesAprovadas, selectedMonth, selectedYear]);

  const filteredPagamentos = useMemo(() => {
    let filtered = userFilteredPagamentos;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.mae_nome.toLowerCase().includes(query) ||
          p.mae_cpf.replace(/\D/g, "").includes(query.replace(/\D/g, ""))
      );
    }

    // Sort by status priority: vínculo pendente > inadimplente > pendente > pago
    return [...filtered].sort((a, b) => {
      const statusA = calcularStatusGeral(a.mae_nome, a.parcelas);
      const statusB = calcularStatusGeral(b.mae_nome, b.parcelas);
      return getStatusGeralOrder(statusA) - getStatusGeralOrder(statusB);
    });
  }, [userFilteredPagamentos, searchQuery]);

  const filteredMaesAprovadas = useMemo(() => {
    let filtered = userFilteredMaesAprovadas;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.nome_mae.toLowerCase().includes(query) ||
          m.cpf.replace(/\D/g, "").includes(query.replace(/\D/g, ""))
      );
    }

    return filtered;
  }, [userFilteredMaesAprovadas, searchQuery]);

  const handleEdit = (pagamento: PagamentoComMae) => {
    setSelectedMaeId(pagamento.mae_id);
    setSelectedMaeNome(pagamento.mae_nome);
    setEditingPagamentoId(pagamento.id);
    setDialogOpen(true);
  };

  const handleAddPagamento = (mae: MaeAprovada) => {
    setSelectedMaeId(mae.id);
    setSelectedMaeNome(mae.nome_mae);
    setEditingPagamentoId(mae.pagamentoId);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!pagamentoToDelete) return;

    const { error } = await supabase
      .from("pagamentos_mae")
      .delete()
      .eq("id", pagamentoToDelete);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message,
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Pagamento excluído com sucesso",
      });
      refetch();
    }

    setDeleteDialogOpen(false);
    setPagamentoToDelete(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pago":
        return <Badge className="bg-emerald-500/20 text-emerald-700">Pago</Badge>;
      case "inadimplente":
        return <Badge variant="destructive">Inadimplente</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards - Quantidades */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mães (Aprovadas + Rescisão)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maesAprovadas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Parcelas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParcelas}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.pagas}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pendentes}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inadimplentes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.inadimplentes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards - Valores */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(stats.valorTotal)}</div>
            <p className="text-xs text-muted-foreground">Todas as parcelas</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Recebido</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-600">{formatCurrency(stats.valorPago)}</div>
            <p className="text-xs text-muted-foreground">Parcelas pagas</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Pendente</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-amber-600">{formatCurrency(stats.valorPendente)}</div>
            <p className="text-xs text-muted-foreground">A receber</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recebido no Período</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xl font-bold text-blue-600">{formatCurrency(stats.valorMesSelecionado)}</div>
            <div className="flex gap-2">
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((mes, idx) => (
                    <SelectItem key={idx} value={String(idx)}>{mes}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="h-7 text-xs w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anos.map((ano) => (
                    <SelectItem key={ano} value={String(ano)}>{ano}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="maes" className="w-full">
        <TabsList>
          <TabsTrigger value="maes" className="gap-1">
            <Users className="h-4 w-4" />
            Mães para Pagamento ({maesAprovadas.length})
          </TabsTrigger>
          <TabsTrigger value="pagamentos" className="gap-1">
            <DollarSign className="h-4 w-4" />
            Pagamentos Cadastrados ({pagamentos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="maes" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mãe</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Mãe Recebeu</TableHead>
                    <TableHead className="text-right">Mãe a Receber</TableHead>
                    <TableHead>Status Pagamento</TableHead>
                    <TableHead className="w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaesAprovadas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Nenhuma mãe encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMaesAprovadas.map((mae) => {
                      // Find pagamento data for this mae
                      const pagamento = pagamentos.find((p) => p.mae_id === mae.id);
                      const totalParcelas = mae.statusParcelas.total;
                      const pagas = mae.statusParcelas.pagas;
                      const progresso = totalParcelas > 0 ? (pagas / totalParcelas) * 100 : 0;
                      const valorTotal = pagamento?.valor_total;

                      // Calcular valores que a mãe recebeu e vai receber
                      const maeRecebeu = pagamento?.parcelas
                        .filter((p) => p.status === "pago")
                        .reduce((acc, p) => acc + (p.valor_a_receber || 0), 0) || 0;
                      const maeAReceber = pagamento?.parcelas
                        .filter((p) => p.status !== "pago")
                        .reduce((acc, p) => acc + (p.valor_a_receber || 0), 0) || 0;

                      return (
                        <TableRow key={mae.id}>
                          <TableCell className="font-medium">{mae.nome_mae}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{formatCpf(mae.cpf)}</TableCell>
                          <TableCell>
                            {pagamento ? (
                              <Badge variant="outline" className="text-xs">
                                {pagamento.tipo_pagamento === "a_vista" ? "Única" : "Parcelado"}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {totalParcelas > 0 ? (
                              <div className="flex items-center gap-2 min-w-[80px]">
                                <span className="text-sm font-medium whitespace-nowrap">{pagas}/{totalParcelas}</span>
                                <Progress value={progresso} className="h-1.5 w-16" />
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {valorTotal ? formatCurrency(valorTotal) : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {maeRecebeu > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(maeRecebeu)}</span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {maeAReceber > 0 ? (
                              <span className="text-amber-600 dark:text-amber-400 font-medium">{formatCurrency(maeAReceber)}</span>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            {!mae.temPagamento ? (
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                Sem Cadastro
                              </Badge>
                            ) : mae.statusParcelas.inadimplentes > 0 ? (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Inadimplente
                              </Badge>
                            ) : mae.statusParcelas.pendentes > 0 && pagas > 0 ? (
                              <Badge className="bg-amber-500/20 text-amber-700">
                                <Clock className="h-3 w-3 mr-1" />
                                Parcial
                              </Badge>
                            ) : mae.statusParcelas.pendentes > 0 ? (
                              <Badge className="bg-amber-500/20 text-amber-700">
                                <Clock className="h-3 w-3 mr-1" />
                                Pendente
                              </Badge>
                            ) : pagas > 0 ? (
                              <Badge className="bg-emerald-500/20 text-emerald-700">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Quitado
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Sem Parcelas</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={mae.temPagamento ? "outline" : "default"}
                              onClick={() => handleAddPagamento(mae)}
                            >
                              {mae.temPagamento ? (
                                <>
                                  <Edit className="h-4 w-4 mr-1" />
                                  Editar
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4 mr-1" />
                                  Cadastrar
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagamentos" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mãe</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Próx. Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPagamentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum pagamento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPagamentos.map((pag) => {
                      const parcelasPagas = pag.parcelas.filter((p) => p.status === "pago").length;
                      const totalParcelas = pag.parcelas.length;
                      const progresso = totalParcelas > 0 ? (parcelasPagas / totalParcelas) * 100 : 0;
                      const statusGeral = calcularStatusGeral(pag.mae_nome, pag.parcelas);
                      const proximoVenc = getProximoVencimento(pag.parcelas);

                      return (
                        <TableRow
                          key={pag.id}
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedPagamentoForDrawer(pag);
                            setDrawerOpen(true);
                          }}
                        >
                          <TableCell>
                            <div>
                              <div className="font-medium">{pag.mae_nome}</div>
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-xs text-muted-foreground">
                                  {pag.mae_cpf ? formatCpf(pag.mae_cpf) : "—"}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {pag.tipo_pagamento === "a_vista" ? "À Vista" : "Parcelado"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[80px]">
                              <span className="text-sm font-medium whitespace-nowrap">{parcelasPagas}/{totalParcelas}</span>
                              <Progress value={progresso} className="h-1.5 w-16" />
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {pag.valor_total ? formatCurrency(pag.valor_total) : "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {proximoVenc ? formatDate(proximoVenc) : "—"}
                          </TableCell>
                          <TableCell>
                            <StatusGeralBadge status={statusGeral} />
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPagamentoForDrawer(pag);
                                  setDrawerOpen(true);
                                }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(pag);
                                }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPagamentoToDelete(pag.id);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedMaeId && (
        <PagamentoDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingPagamentoId(undefined);
              setSelectedMaeId(null);
            }
          }}
          maeId={selectedMaeId}
          maeNome={selectedMaeNome}
          onSuccess={refetch}
          existingPagamentoId={editingPagamentoId}
        />
      )}

      <PagamentoDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        pagamento={selectedPagamentoForDrawer}
        onUpdated={refetch}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este pagamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
