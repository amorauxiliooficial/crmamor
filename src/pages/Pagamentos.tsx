import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePagamentos, type PagamentoComMae } from "@/hooks/usePagamentos";
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
import {
  Loader2,
  ArrowLeft,
  Edit,
  Trash2,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  FileText,
  Building2,
  Settings,
  TrendingUp,
  Percent,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import { formatCpf } from "@/lib/formatters";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PagamentoDialog } from "@/components/pagamentos/PagamentoDialog";
import { PagamentoDetailDrawer, StatusGeralBadge } from "@/components/pagamentos/PagamentoDetailDrawer";
import {
  calcularStatusGeral,
  getProximoVencimento,
  getStatusGeralOrder,
} from "@/lib/pagamentoUtils";
import { ComunicadoDialog } from "@/components/pagamentos/ComunicadoDialog";
import { BancosDialog } from "@/components/pagamentos/BancosDialog";
import { TemplatesDialog } from "@/components/pagamentos/TemplatesDialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Pagamentos = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { pagamentos, isLoading, isFetching, refetch } = usePagamentos();

  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMaeId, setSelectedMaeId] = useState<string | null>(null);
  const [selectedMaeNome, setSelectedMaeNome] = useState("");
  const [editingPagamentoId, setEditingPagamentoId] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pagamentoToDelete, setPagamentoToDelete] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPagamentoForDrawer, setSelectedPagamentoForDrawer] = useState<PagamentoComMae | null>(null);
  
  // Dialog states for comunicado feature
  const [comunicadoDialogOpen, setComunicadoDialogOpen] = useState(false);
  const [selectedPagamentoForComunicado, setSelectedPagamentoForComunicado] = useState<PagamentoComMae | null>(null);
  const [maeCepMap, setMaeCepMap] = useState<Record<string, string>>({});
  const [bancosDialogOpen, setBancosDialogOpen] = useState(false);
  const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Handle navigation state to open specific payment dialog
  useEffect(() => {
    const state = location.state as { 
      openPagamentoId?: string; 
      maeId?: string; 
      maeNome?: string 
    } | null;
    
    if (state?.openPagamentoId && state?.maeId) {
      setSelectedMaeId(state.maeId);
      setSelectedMaeNome(state.maeNome || "");
      setEditingPagamentoId(state.openPagamentoId);
      setDialogOpen(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname]);

  // Fetch CEP for all mães when pagamentos load
  useEffect(() => {
    const fetchCeps = async () => {
      if (pagamentos.length === 0) return;
      const maeIds = [...new Set(pagamentos.map((p) => p.mae_id))];
      const { data } = await supabase
        .from("mae_processo")
        .select("id, cep")
        .in("id", maeIds);
      if (data) {
        const cepMap: Record<string, string> = {};
        data.forEach((m: { id: string; cep: string | null }) => {
          if (m.cep) cepMap[m.id] = m.cep;
        });
        setMaeCepMap(cepMap);
      }
    };
    fetchCeps();
  }, [pagamentos]);

  const handleOpenComunicado = (pagamento: PagamentoComMae) => {
    setSelectedPagamentoForComunicado(pagamento);
    setComunicadoDialogOpen(true);
  };

  const stats = useMemo(() => {
    let totalParcelas = 0;
    let pagas = 0;
    let pendentes = 0;
    let inadimplentes = 0;
    let comissaoTotal = 0;
    let comissaoRecebida = 0;
    let comissaoPendente = 0;

    pagamentos.forEach((pag) => {
      comissaoTotal += pag.comissao_total;
      comissaoRecebida += pag.comissao_recebida;
      comissaoPendente += pag.comissao_pendente;
      pag.parcelas.forEach((p) => {
        totalParcelas++;
        if (p.status === "pago") pagas++;
        else if (p.status === "pendente") pendentes++;
        else if (p.status === "inadimplente") inadimplentes++;
      });
    });

    return { totalParcelas, pagas, pendentes, inadimplentes, comissaoTotal, comissaoRecebida, comissaoPendente };
  }, [pagamentos]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const filteredPagamentos = useMemo(() => {
    let filtered = pagamentos;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.mae_nome.toLowerCase().includes(query) ||
          p.mae_cpf.replace(/\D/g, "").includes(query.replace(/\D/g, ""))
      );
    }
    // Sort by status priority
    return [...filtered].sort((a, b) => {
      const statusA = calcularStatusGeral(a.mae_nome, a.parcelas);
      const statusB = calcularStatusGeral(b.mae_nome, b.parcelas);
      return getStatusGeralOrder(statusA) - getStatusGeralOrder(statusB);
    });
  }, [pagamentos, searchQuery]);

  const handleEdit = (pagamento: PagamentoComMae) => {
    setSelectedMaeId(pagamento.mae_id);
    setSelectedMaeNome(pagamento.mae_nome);
    setEditingPagamentoId(pagamento.id);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!pagamentoToDelete) return;
    const { error } = await supabase
      .from("pagamentos_mae")
      .delete()
      .eq("id", pagamentoToDelete);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: error.message });
    } else {
      toast({ title: "Sucesso", description: "Pagamento excluído com sucesso" });
      refetch();
    }
    setDeleteDialogOpen(false);
    setPagamentoToDelete(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <main className="p-3 md:p-6 space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-8 w-8 md:h-10 md:w-10">
              <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <h1 className="text-lg md:text-2xl font-bold">Controle de Pagamentos</h1>
            {isFetching && !isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Settings className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Configurar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setBancosDialogOpen(true)}>
                  <Building2 className="h-4 w-4 mr-2" />
                  Gerenciar Bancos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTemplatesDialogOpen(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Gerenciar Templates
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-8">
              <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards - Parcelas */}
        <section className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:pt-4 md:px-4">
              <CardTitle className="text-xs md:text-sm font-medium">Total Parcelas</CardTitle>
              <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:px-4 md:pb-4">
              <div className="text-xl md:text-2xl font-bold">{stats.totalParcelas}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:pt-4 md:px-4">
              <CardTitle className="text-xs md:text-sm font-medium">Pagas</CardTitle>
              <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:px-4 md:pb-4">
              <div className="text-xl md:text-2xl font-bold text-primary">{stats.pagas}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-muted-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:pt-4 md:px-4">
              <CardTitle className="text-xs md:text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:px-4 md:pb-4">
              <div className="text-xl md:text-2xl font-bold text-muted-foreground">{stats.pendentes}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:pt-4 md:px-4">
              <CardTitle className="text-xs md:text-sm font-medium">Inadimplentes</CardTitle>
              <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4 text-destructive" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:px-4 md:pb-4">
              <div className="text-xl md:text-2xl font-bold text-destructive">{stats.inadimplentes}</div>
            </CardContent>
          </Card>
        </section>

        {/* Stats Cards - Comissões */}
        <section className="grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:pt-4 md:px-4">
              <CardTitle className="text-xs md:text-sm font-medium">Comissão Total</CardTitle>
              <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:px-4 md:pb-4">
              <div className="text-xl md:text-2xl font-bold text-primary">{formatCurrency(stats.comissaoTotal)}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Soma de todas as comissões</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:pt-4 md:px-4">
              <CardTitle className="text-xs md:text-sm font-medium">Recebido</CardTitle>
              <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:px-4 md:pb-4">
              <div className="text-xl md:text-2xl font-bold text-primary">{formatCurrency(stats.comissaoRecebida)}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Parcelas pagas</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-muted-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:pb-2 md:pt-4 md:px-4">
              <CardTitle className="text-xs md:text-sm font-medium">A Receber</CardTitle>
              <Clock className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:px-4 md:pb-4">
              <div className="text-xl md:text-2xl font-bold text-muted-foreground">{formatCurrency(stats.comissaoPendente)}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground">Parcelas pendentes</p>
            </CardContent>
          </Card>
        </section>

        {/* Mobile Card List */}
        <div className="md:hidden space-y-2">
          {filteredPagamentos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum pagamento encontrado
            </div>
          ) : (
            filteredPagamentos.map((pag) => {
              const parcelasPagas = pag.parcelas.filter((p) => p.status === "pago").length;
              const totalParcelas = pag.parcelas.length;
              const progresso = totalParcelas > 0 ? (parcelasPagas / totalParcelas) * 100 : 0;
              const statusGeral = calcularStatusGeral(pag.mae_nome, pag.parcelas);
              const proximoVenc = getProximoVencimento(pag.parcelas);

              return (
                <Card
                  key={pag.id}
                  className="overflow-hidden cursor-pointer active:bg-muted/50 transition-colors"
                  onClick={() => {
                    setSelectedPagamentoForDrawer(pag);
                    setDrawerOpen(true);
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{pag.mae_nome}</h3>
                        <p className="text-xs text-muted-foreground font-mono">{formatCpf(pag.mae_cpf)}</p>
                      </div>
                      <StatusGeralBadge status={statusGeral} />
                    </div>

                    <div className="flex items-center justify-between gap-3 mb-2">
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {pag.tipo_pagamento === "a_vista" ? "À Vista" : "Parcelado"}
                      </Badge>
                      <div className="flex items-center gap-1.5 flex-1 max-w-[120px]">
                        <span className="text-xs font-medium">{parcelasPagas}/{totalParcelas}</span>
                        <Progress value={progresso} className="h-1.5" />
                      </div>
                      {pag.valor_total && (
                        <span className="text-sm font-semibold">{formatCurrency(pag.valor_total)}</span>
                      )}
                    </div>

                    {proximoVenc && (
                      <p className="text-[10px] text-muted-foreground">
                        Próx. vencimento: {formatDate(proximoVenc)}
                      </p>
                    )}

                    <div className="flex flex-wrap justify-end gap-1 mt-2 pt-2 border-t">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); handleOpenComunicado(pag); }}>
                        <FileText className="h-3 w-3 mr-1" />
                        Comunicado
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={(e) => { e.stopPropagation(); handleEdit(pag); }}>
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPagamentoToDelete(pag.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Desktop Table */}
        <Card className="hidden md:block">
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
                            <div className="font-mono text-xs text-muted-foreground">
                              {pag.mae_cpf ? formatCpf(pag.mae_cpf) : "—"}
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
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenComunicado(pag); }}>
                                <FileText className="h-4 w-4 mr-2" />
                                Comunicado
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(pag); }}>
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
      </main>

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
            <AlertDialogTitle>Excluir pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as parcelas serão excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedPagamentoForComunicado && (
        <ComunicadoDialog
          open={comunicadoDialogOpen}
          onOpenChange={(open) => {
            setComunicadoDialogOpen(open);
            if (!open) setSelectedPagamentoForComunicado(null);
          }}
          pagamento={selectedPagamentoForComunicado}
          maeCep={maeCepMap[selectedPagamentoForComunicado.mae_id]}
        />
      )}

      <BancosDialog open={bancosDialogOpen} onOpenChange={setBancosDialogOpen} />
      <TemplatesDialog open={templatesDialogOpen} onOpenChange={setTemplatesDialogOpen} />
    </div>
  );
};

export default Pagamentos;
