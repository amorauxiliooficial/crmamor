import { useState, useEffect, useMemo } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { formatCpf } from "@/lib/formatters";
import { format, parseISO, isThisMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PagamentoDialog } from "@/components/pagamentos/PagamentoDialog";
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
  parcelas: {
    id: string;
    numero_parcela: number;
    data_pagamento: string | null;
    status: string;
    observacoes: string | null;
    valor: number | null;
  }[];
}

interface MaeAprovada {
  id: string;
  nome_mae: string;
  cpf: string;
  temPagamento: boolean;
}

interface PagamentosTabProps {
  searchQuery: string;
}

export function PagamentosTab({ searchQuery }: PagamentosTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [pagamentos, setPagamentos] = useState<PagamentoComMae[]>([]);
  const [maesAprovadas, setMaesAprovadas] = useState<MaeAprovada[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMaeId, setSelectedMaeId] = useState<string | null>(null);
  const [selectedMaeNome, setSelectedMaeNome] = useState("");
  const [editingPagamentoId, setEditingPagamentoId] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pagamentoToDelete, setPagamentoToDelete] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);

    // Fetch mães aprovadas
    const { data: maesData, error: maesError } = await supabase
      .from("mae_processo")
      .select("id, nome_mae, cpf")
      .eq("status_processo", "Aprovada")
      .order("nome_mae", { ascending: true });

    if (maesError) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar mães",
        description: maesError.message,
      });
    }

    // Fetch pagamentos
    const { data: pagamentosData, error: pagError } = await supabase
      .from("pagamentos_mae")
      .select("*")
      .order("created_at", { ascending: false });

    if (pagError) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar pagamentos",
        description: pagError.message,
      });
      setLoading(false);
      return;
    }

    // Get mae_ids with payments
    const maeIdsComPagamento = new Set(pagamentosData?.map(p => p.mae_id) || []);

    // Build maes aprovadas list
    const maesComStatus: MaeAprovada[] = (maesData || []).map(mae => ({
      id: mae.id,
      nome_mae: mae.nome_mae,
      cpf: mae.cpf,
      temPagamento: maeIdsComPagamento.has(mae.id),
    }));
    setMaesAprovadas(maesComStatus);

    // Build pagamentos completos
    const pagamentosCompletos: PagamentoComMae[] = [];

    for (const pag of pagamentosData || []) {
      const { data: mae } = await supabase
        .from("mae_processo")
        .select("nome_mae, cpf")
        .eq("id", pag.mae_id)
        .single();

      const { data: parcelas } = await supabase
        .from("parcelas_pagamento")
        .select("*")
        .eq("pagamento_id", pag.id)
        .order("numero_parcela", { ascending: true });

      pagamentosCompletos.push({
        id: pag.id,
        mae_id: pag.mae_id,
        tipo_pagamento: pag.tipo_pagamento,
        total_parcelas: pag.total_parcelas ?? 0,
        valor_total: pag.valor_total,
        mae_nome: mae?.nome_mae || "N/A",
        mae_cpf: mae?.cpf || "",
        parcelas: (parcelas || []).map((p: any) => ({
          id: p.id,
          numero_parcela: p.numero_parcela,
          data_pagamento: p.data_pagamento,
          status: p.status,
          observacoes: p.observacoes,
          valor: p.valor,
        })),
      });
    }

    setPagamentos(pagamentosCompletos);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const stats = useMemo(() => {
    let totalParcelas = 0;
    let pagas = 0;
    let pendentes = 0;
    let inadimplentes = 0;
    let valorTotal = 0;
    let valorPago = 0;
    let valorPendente = 0;
    let valorMesAtual = 0;

    pagamentos.forEach((pag) => {
      pag.parcelas.forEach((p) => {
        totalParcelas++;
        const valor = p.valor || 0;
        valorTotal += valor;

        if (p.status === "pago") {
          pagas++;
          valorPago += valor;
          // Verificar se foi pago este mês
          if (p.data_pagamento) {
            try {
              const dataPag = parseISO(p.data_pagamento);
              if (isThisMonth(dataPag)) {
                valorMesAtual += valor;
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

    const maesSemPagamento = maesAprovadas.filter(m => !m.temPagamento).length;

    return { 
      totalParcelas, 
      pagas, 
      pendentes, 
      inadimplentes, 
      maesSemPagamento,
      valorTotal,
      valorPago,
      valorPendente,
      valorMesAtual,
    };
  }, [pagamentos, maesAprovadas]);

  const filteredPagamentos = useMemo(() => {
    if (!searchQuery.trim()) return pagamentos;

    const query = searchQuery.toLowerCase();
    return pagamentos.filter(
      (p) =>
        p.mae_nome.toLowerCase().includes(query) ||
        p.mae_cpf.replace(/\D/g, "").includes(query.replace(/\D/g, ""))
    );
  }, [pagamentos, searchQuery]);

  const filteredMaesAprovadas = useMemo(() => {
    if (!searchQuery.trim()) return maesAprovadas;

    const query = searchQuery.toLowerCase();
    return maesAprovadas.filter(
      (m) =>
        m.nome_mae.toLowerCase().includes(query) ||
        m.cpf.replace(/\D/g, "").includes(query.replace(/\D/g, ""))
    );
  }, [maesAprovadas, searchQuery]);

  const handleEdit = (pagamento: PagamentoComMae) => {
    setSelectedMaeId(pagamento.mae_id);
    setSelectedMaeNome(pagamento.mae_nome);
    setEditingPagamentoId(pagamento.id);
    setDialogOpen(true);
  };

  const handleAddPagamento = (mae: MaeAprovada) => {
    setSelectedMaeId(mae.id);
    setSelectedMaeNome(mae.nome_mae);
    setEditingPagamentoId(undefined);
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
      fetchData();
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

  if (loading) {
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
            <CardTitle className="text-sm font-medium">Mães Aprovadas</CardTitle>
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
            <CardTitle className="text-sm font-medium">Recebido Este Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600">{formatCurrency(stats.valorMesAtual)}</div>
            <p className="text-xs text-muted-foreground">Dezembro/2025</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="maes" className="w-full">
        <TabsList>
          <TabsTrigger value="maes" className="gap-1">
            <Users className="h-4 w-4" />
            Mães Aprovadas ({maesAprovadas.length})
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
                    <TableHead>Status Pagamento</TableHead>
                    <TableHead className="w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaesAprovadas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhuma mãe aprovada encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMaesAprovadas.map((mae) => (
                      <TableRow key={mae.id}>
                        <TableCell className="font-medium">{mae.nome_mae}</TableCell>
                        <TableCell className="font-mono text-sm">{formatCpf(mae.cpf)}</TableCell>
                        <TableCell>
                          {mae.temPagamento ? (
                            <Badge className="bg-emerald-500/20 text-emerald-700">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Cadastrado
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              Pendente
                            </Badge>
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
                    ))
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
                    <TableHead>CPF</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Parcelas</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPagamentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhum pagamento encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPagamentos.map((pag) => {
                      const parcelasPagas = pag.parcelas.filter(p => p.status === "pago").length;
                      const totalParcelas = pag.parcelas.length;
                      const parcelasRestantes = totalParcelas - parcelasPagas;
                      
                      return (
                        <TableRow key={pag.id}>
                          <TableCell className="font-medium">{pag.mae_nome}</TableCell>
                          <TableCell className="font-mono text-sm">{formatCpf(pag.mae_cpf)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {pag.tipo_pagamento === "a_vista" ? "À Vista" : `${pag.total_parcelas}x`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{parcelasPagas}/{totalParcelas}</span>
                              <span className="text-xs text-muted-foreground">
                                {parcelasRestantes > 0 ? `${parcelasRestantes} restante${parcelasRestantes > 1 ? "s" : ""}` : "Completo"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {pag.parcelas.map((p) => (
                                <div key={p.id} className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">{p.numero_parcela}ª:</span>
                                  <span className="font-medium">{p.valor ? formatCurrency(p.valor) : "-"}</span>
                                </div>
                              ))}
                              {pag.valor_total && (
                                <div className="border-t pt-1 mt-1">
                                  <span className="text-xs font-semibold">Total: {formatCurrency(pag.valor_total)}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {pag.parcelas.map((p) => (
                                <div key={p.id} className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">{p.numero_parcela}ª:</span>
                                  <span>{formatDate(p.data_pagamento)}</span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {pag.parcelas.map((p) => (
                                <div key={p.id}>{getStatusBadge(p.status)}</div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(pag)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setPagamentoToDelete(pag.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
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
          onSuccess={fetchData}
          existingPagamentoId={editingPagamentoId}
        />
      )}

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