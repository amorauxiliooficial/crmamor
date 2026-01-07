import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import {
  Loader2,
  ArrowLeft,
  Edit,
  Trash2,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { formatCpf } from "@/lib/formatters";
import { format, parseISO } from "date-fns";
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
  mae_nome: string;
  mae_cpf: string;
  parcelas: {
    id: string;
    numero_parcela: number;
    data_pagamento: string | null;
    status: string;
    observacoes: string | null;
  }[];
}

const Pagamentos = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [pagamentos, setPagamentos] = useState<PagamentoComMae[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMaeId, setSelectedMaeId] = useState<string | null>(null);
  const [selectedMaeNome, setSelectedMaeNome] = useState("");
  const [editingPagamentoId, setEditingPagamentoId] = useState<string | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pagamentoToDelete, setPagamentoToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchPagamentos = async () => {
    setLoading(true);

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

    // Fetch mae info and parcelas for each pagamento
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
        total_parcelas: pag.total_parcelas,
        mae_nome: mae?.nome_mae || "N/A",
        mae_cpf: mae?.cpf || "",
        parcelas: parcelas || [],
      });
    }

    setPagamentos(pagamentosCompletos);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchPagamentos();
    }
  }, [user]);

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
      // Clear the state to prevent reopening on refresh
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname]);

  const stats = useMemo(() => {
    let totalParcelas = 0;
    let pagas = 0;
    let pendentes = 0;
    let inadimplentes = 0;

    pagamentos.forEach((pag) => {
      pag.parcelas.forEach((p) => {
        totalParcelas++;
        if (p.status === "pago") pagas++;
        else if (p.status === "pendente") pendentes++;
        else if (p.status === "inadimplente") inadimplentes++;
      });
    });

    return { totalParcelas, pagas, pendentes, inadimplentes };
  }, [pagamentos]);

  const filteredPagamentos = useMemo(() => {
    if (!searchQuery.trim()) return pagamentos;

    const query = searchQuery.toLowerCase();
    return pagamentos.filter(
      (p) =>
        p.mae_nome.toLowerCase().includes(query) ||
        p.mae_cpf.replace(/\D/g, "").includes(query.replace(/\D/g, ""))
    );
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
      fetchPagamentos();
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Controle de Pagamentos</h1>
        </div>

        {/* Stats Cards */}
        <section className="grid gap-4 md:grid-cols-4">
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
        </section>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mãe</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Parcelas</TableHead>
                  <TableHead>Datas de Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
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
                  filteredPagamentos.map((pag) => (
                    <TableRow key={pag.id}>
                      <TableCell className="font-medium">{pag.mae_nome}</TableCell>
                      <TableCell className="font-mono text-sm">{formatCpf(pag.mae_cpf)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {pag.tipo_pagamento === "a_vista" ? "À Vista" : `${pag.total_parcelas}x`}
                        </Badge>
                      </TableCell>
                      <TableCell>{pag.total_parcelas}</TableCell>
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
                  ))
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
          onSuccess={fetchPagamentos}
          existingPagamentoId={editingPagamentoId}
        />
      )}

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
    </div>
  );
};

export default Pagamentos;
