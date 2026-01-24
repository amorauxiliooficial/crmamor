import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  AlertCircle,
  Scale,
  ArrowLeft,
  Loader2,
  TrendingUp,
  TrendingDown,
  Clock,
  History,
} from "lucide-react";
import { PreAnaliseHistoricoDialog } from "@/components/preanalise/PreAnaliseHistoricoDialog";
import {
  STATUS_ANALISE_LABELS,
  STATUS_ANALISE_COLORS,
  CATEGORIA_SEGURADA_OPTIONS,
  RESULTADO_ATENDENTE_LABELS,
  type StatusPreAnalise,
  type ResultadoAtendente,
} from "@/types/preAnalise";
import type { MaeProcesso } from "@/types/mae";

interface AnaliseComMae {
  id: string;
  mae_id: string;
  status_analise: string;
  categoria_identificada: string | null;
  riscos_identificados: { nivel: string; motivo: string }[];
  resultado_atendente?: string;
  motivo_curto?: string;
  versao: number;
  created_at: string;
  processado_em: string | null;
  mae_processo: {
    nome_mae: string;
    cpf: string;
    categoria_previdenciaria: string;
    status_processo: string;
    tipo_evento: string;
    data_evento: string | null;
    is_gestante: boolean;
    telefone: string | null;
    email: string | null;
    user_id: string;
    id: string;
    contrato_assinado: boolean;
    verificacao_duas_etapas: boolean;
    data_ultima_atualizacao: string;
  };
}

export default function PreAnalises() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const navigate = useNavigate();

  const [analises, setAnalises] = useState<AnaliseComMae[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");
  const [riscoFilter, setRiscoFilter] = useState<string>("all");
  const [resultadoFilter, setResultadoFilter] = useState<string>("all");
  const [selectedMae, setSelectedMae] = useState<MaeProcesso | null>(null);
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAnalises();
    }
  }, [user]);

  const fetchAnalises = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("pre_analise")
        .select(`
          id,
          mae_id,
          status_analise,
          categoria_identificada,
          riscos_identificados,
          resultado_atendente,
          motivo_curto,
          versao,
          created_at,
          processado_em,
          mae_processo!inner (
            id,
            nome_mae,
            cpf,
            categoria_previdenciaria,
            status_processo,
            tipo_evento,
            data_evento,
            is_gestante,
            telefone,
            email,
            user_id,
            contrato_assinado,
            verificacao_duas_etapas,
            data_ultima_atualizacao
          )
        `)
        .order("processado_em", { ascending: false });

      if (error) throw error;

      const latestByMae = new Map<string, AnaliseComMae>();
      (data || []).forEach((item) => {
        const existing = latestByMae.get(item.mae_id);
        if (!existing || item.versao > existing.versao) {
          latestByMae.set(item.mae_id, item as unknown as AnaliseComMae);
        }
      });

      setAnalises(Array.from(latestByMae.values()));
    } catch (error) {
      console.error("Erro ao buscar análises:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAnalises = useMemo(() => {
    return analises.filter((analise) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        analise.mae_processo.nome_mae.toLowerCase().includes(searchLower) ||
        analise.mae_processo.cpf.includes(searchQuery.replace(/\D/g, ""));

      // Para atendentes, filtro por resultado_atendente; para admin, por status_analise
      let matchesStatus = true;
      if (isAdmin) {
        const normalizedStatus = analise.status_analise?.toUpperCase();
        matchesStatus = statusFilter === "all" || normalizedStatus === statusFilter;
      } else {
        matchesStatus = resultadoFilter === "all" || analise.resultado_atendente === resultadoFilter;
      }

      const matchesCategoria =
        categoriaFilter === "all" ||
        analise.categoria_identificada?.toLowerCase() === categoriaFilter;

      // Filtro de risco apenas para admin
      let matchesRisco = true;
      if (isAdmin) {
        const hasBlockingRisk = analise.riscos_identificados?.some(
          (r) => r.nivel === "BLOQUEIO"
        );
        const hasAlertRisk = analise.riscos_identificados?.some(
          (r) => r.nivel === "ALERTA"
        );

        if (riscoFilter === "bloqueio") matchesRisco = hasBlockingRisk;
        else if (riscoFilter === "alerta") matchesRisco = hasAlertRisk && !hasBlockingRisk;
        else if (riscoFilter === "nenhum") matchesRisco = !hasBlockingRisk && !hasAlertRisk;
      }

      return matchesSearch && matchesStatus && matchesCategoria && matchesRisco;
    });
  }, [analises, searchQuery, statusFilter, categoriaFilter, riscoFilter, resultadoFilter, isAdmin]);

  const stats = useMemo(() => {
    const total = analises.length;
    
    if (isAdmin) {
      const aprovadas = analises.filter(
        (a) => a.status_analise?.toUpperCase() === "APROVADA"
      ).length;
      const ressalvas = analises.filter(
        (a) => a.status_analise?.toUpperCase() === "APROVADA_COM_RESSALVAS"
      ).length;
      const reprovadas = analises.filter(
        (a) => a.status_analise?.toUpperCase() === "NAO_APROVAVEL"
      ).length;
      const comBloqueio = analises.filter((a) =>
        a.riscos_identificados?.some((r) => r.nivel === "BLOQUEIO")
      ).length;
      return { total, aprovadas, ressalvas, reprovadas, comBloqueio };
    } else {
      // Stats simplificadas para atendentes
      const aprovados = analises.filter((a) => a.resultado_atendente === "APROVADO").length;
      const reprovados = analises.filter((a) => a.resultado_atendente === "REPROVADO").length;
      const juridico = analises.filter((a) => a.resultado_atendente === "JURIDICO").length;
      return { total, aprovados, reprovados, juridico };
    }
  }, [analises, isAdmin]);

  const getStatusIcon = (status: string) => {
    const normalizedStatus = status?.toUpperCase();
    switch (normalizedStatus) {
      case "APROVADA":
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case "APROVADA_COM_RESSALVAS":
        return <AlertTriangle className="h-4 w-4 text-chart-1" />;
      case "NAO_APROVAVEL":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getResultadoAtendenteIcon = (resultado?: string) => {
    switch (resultado) {
      case "APROVADO":
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case "REPROVADO":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "JURIDICO":
        return <Scale className="h-4 w-4 text-chart-1" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getResultadoAtendenteStyle = (resultado?: string) => {
    switch (resultado) {
      case "APROVADO":
        return "bg-primary/10 text-primary border-primary/20";
      case "REPROVADO":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "JURIDICO":
        return "bg-chart-1/10 text-chart-1 border-chart-1/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatCpf = (cpf: string) => {
    const numbers = cpf.replace(/\D/g, "");
    return numbers
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const handleRowClick = (analise: AnaliseComMae) => {
    // Apenas admin pode ver o histórico detalhado
    if (!isAdmin) return;
    
    const mae: MaeProcesso = {
      id: analise.mae_processo.id,
      nome_mae: analise.mae_processo.nome_mae,
      cpf: analise.mae_processo.cpf,
      categoria_previdenciaria: analise.mae_processo.categoria_previdenciaria as MaeProcesso["categoria_previdenciaria"],
      status_processo: analise.mae_processo.status_processo as MaeProcesso["status_processo"],
      tipo_evento: analise.mae_processo.tipo_evento as MaeProcesso["tipo_evento"],
      data_evento: analise.mae_processo.data_evento || undefined,
      is_gestante: analise.mae_processo.is_gestante,
      telefone: analise.mae_processo.telefone || undefined,
      email: analise.mae_processo.email || undefined,
      user_id: analise.mae_processo.user_id,
      contrato_assinado: analise.mae_processo.contrato_assinado,
      verificacao_duas_etapas: analise.mae_processo.verificacao_duas_etapas,
      data_ultima_atualizacao: analise.mae_processo.data_ultima_atualizacao,
    };
    setSelectedMae(mae);
    setHistoricoDialogOpen(true);
  };

  if (authLoading || isAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        searchQuery="" 
        onSearchChange={() => {}}
      />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                Pré-Análises de Elegibilidade
              </h1>
              <p className="text-muted-foreground">
                {isAdmin 
                  ? "Visão completa com detalhes técnicos, riscos e histórico"
                  : "Consulte os resultados das análises de elegibilidade"
                }
              </p>
            </div>
          </div>
          {isAdmin && (
            <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
              <Scale className="h-3 w-3" />
              Visão Admin/Jurídico
            </Badge>
          )}
        </div>

        {/* Stats Cards - Diferentes para Admin e Atendente */}
        {isAdmin ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Aprovadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{"aprovadas" in stats ? stats.aprovadas : 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4 text-chart-1" />
                  Com Ressalvas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-chart-1">{"ressalvas" in stats ? stats.ressalvas : 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  Não Aprováveis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">{"reprovadas" in stats ? stats.reprovadas : 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Com Bloqueio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">{"comBloqueio" in stats ? stats.comBloqueio : 0}</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Stats simplificadas para atendentes
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Aprovados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{"aprovados" in stats ? stats.aprovados : 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Reprovados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">{"reprovados" in stats ? stats.reprovados : 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Scale className="h-4 w-4 text-chart-1" />
                  Jurídico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-chart-1">{"juridico" in stats ? stats.juridico : 0}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters - Diferentes para Admin e Atendente */}
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isAdmin ? (
            <>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="APROVADA">Aprovada</SelectItem>
                  <SelectItem value="APROVADA_COM_RESSALVAS">Com Ressalvas</SelectItem>
                  <SelectItem value="NAO_APROVAVEL">Não Aprovável</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Categorias</SelectItem>
                  {CATEGORIA_SEGURADA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={riscoFilter} onValueChange={setRiscoFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Risco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Riscos</SelectItem>
                  <SelectItem value="bloqueio">Com Bloqueio</SelectItem>
                  <SelectItem value="alerta">Apenas Alertas</SelectItem>
                  <SelectItem value="nenhum">Sem Riscos</SelectItem>
                </SelectContent>
              </Select>
            </>
          ) : (
            // Filtros simplificados para atendentes
            <Select value={resultadoFilter} onValueChange={setResultadoFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Resultado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Resultados</SelectItem>
                <SelectItem value="APROVADO">✅ Aprovado</SelectItem>
                <SelectItem value="REPROVADO">❌ Reprovado</SelectItem>
                <SelectItem value="JURIDICO">⚖️ Jurídico</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Table - Diferentes colunas para Admin e Atendente */}
        <Card>
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredAnalises.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Nenhuma análise encontrada</h3>
                <p className="text-sm text-muted-foreground">
                  {analises.length === 0
                    ? "Ainda não há pré-análises realizadas."
                    : "Tente ajustar os filtros de busca."}
                </p>
              </div>
            ) : isAdmin ? (
              // Tabela completa para Admin
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Riscos</TableHead>
                    <TableHead>Versão</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnalises.map((analise) => {
                    const normalizedStatus = analise.status_analise?.toUpperCase() as keyof typeof STATUS_ANALISE_LABELS;
                    const bloqueios = analise.riscos_identificados?.filter(
                      (r) => r.nivel === "BLOQUEIO"
                    ).length || 0;
                    const alertas = analise.riscos_identificados?.filter(
                      (r) => r.nivel === "ALERTA"
                    ).length || 0;

                    return (
                      <TableRow
                        key={analise.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(analise)}
                      >
                        <TableCell className="font-medium">
                          {analise.mae_processo.nome_mae}
                        </TableCell>
                        <TableCell>{formatCpf(analise.mae_processo.cpf)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(analise.status_analise)}
                            <Badge className={STATUS_ANALISE_COLORS[normalizedStatus] || "bg-muted"}>
                              {STATUS_ANALISE_LABELS[normalizedStatus] || analise.status_analise}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">
                          {analise.categoria_identificada || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {bloqueios > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {bloqueios} bloqueio{bloqueios > 1 ? "s" : ""}
                              </Badge>
                            )}
                            {alertas > 0 && (
                              <Badge variant="outline" className="text-xs border-chart-1 text-chart-1">
                                {alertas} alerta{alertas > 1 ? "s" : ""}
                              </Badge>
                            )}
                            {bloqueios === 0 && alertas === 0 && (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <History className="h-3 w-3" />
                            v{analise.versao}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {analise.processado_em
                            ? format(new Date(analise.processado_em), "dd/MM/yy HH:mm", {
                                locale: ptBR,
                              })
                            : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              // Tabela simplificada para Atendente
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnalises.map((analise) => (
                    <TableRow key={analise.id}>
                      <TableCell className="font-medium">
                        {analise.mae_processo.nome_mae}
                      </TableCell>
                      <TableCell>{formatCpf(analise.mae_processo.cpf)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getResultadoAtendenteIcon(analise.resultado_atendente)}
                          <Badge className={getResultadoAtendenteStyle(analise.resultado_atendente)}>
                            {analise.resultado_atendente === "APROVADO" && "✅ Aprovado"}
                            {analise.resultado_atendente === "REPROVADO" && "❌ Reprovado"}
                            {analise.resultado_atendente === "JURIDICO" && "⚖️ Jurídico"}
                            {!analise.resultado_atendente && "Pendente"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {analise.processado_em
                          ? format(new Date(analise.processado_em), "dd/MM/yy HH:mm", {
                              locale: ptBR,
                            })
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </Card>
      </main>

      {/* Dialog de Histórico - Apenas para Admin */}
      {isAdmin && selectedMae && (
        <PreAnaliseHistoricoDialog
          open={historicoDialogOpen}
          onOpenChange={setHistoricoDialogOpen}
          mae={selectedMae}
        />
      )}
    </div>
  );
}
