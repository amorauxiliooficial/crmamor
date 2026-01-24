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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  Search,
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
  Filter,
  UserPlus,
  FileText,
  ChevronRight,
} from "lucide-react";
import { PreAnaliseHistoricoDialog } from "@/components/preanalise/PreAnaliseHistoricoDialog";
import { NovaPreAnaliseForm } from "@/components/preanalise/NovaPreAnaliseForm";
import { MaeFormDialog } from "@/components/mae/MaeFormDialog";
import {
  STATUS_ANALISE_LABELS,
  CATEGORIA_SEGURADA_OPTIONS,
} from "@/types/preAnalise";
import type { MaeProcesso } from "@/types/mae";
import { cn } from "@/lib/utils";

interface AnaliseComMae {
  id: string;
  mae_id: string | null;
  session_id?: string | null;
  nome_temporario?: string | null;
  status_analise: string;
  categoria_identificada: string | null;
  riscos_identificados: { nivel: string; motivo: string }[];
  resultado_atendente?: string;
  motivo_curto?: string;
  versao: number;
  created_at: string;
  processado_em: string | null;
  dados_entrada?: {
    documentos?: {
      cnis_url?: string;
      ctps_url?: string;
      certidao_url?: string;
    };
  };
  mae_processo?: {
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
  } | null;
}

export default function PreAnalises() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const navigate = useNavigate();

  const [analises, setAnalises] = useState<AnaliseComMae[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");
  const [riscoFilter, setRiscoFilter] = useState<string>("all");
  const [selectedMaeHistorico, setSelectedMaeHistorico] = useState<MaeProcesso | null>(null);
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false);
  const [selectedAnaliseForRegister, setSelectedAnaliseForRegister] = useState<AnaliseComMae | null>(null);
  const [maeDialogOpen, setMaeDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && !isAdminLoading && isAdmin) {
      fetchAnalises();
    }
  }, [user, isAdmin, isAdminLoading]);

  const fetchAnalises = async () => {
    setIsLoading(true);
    try {
      const { data: linkedData, error: linkedError } = await supabase
        .from("pre_analise")
        .select(`
          id,
          mae_id,
          session_id,
          nome_temporario,
          status_analise,
          categoria_identificada,
          riscos_identificados,
          resultado_atendente,
          motivo_curto,
          versao,
          created_at,
          processado_em,
          dados_entrada,
          mae_processo (
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

      if (linkedError) throw linkedError;

      const allAnalises: AnaliseComMae[] = [];
      const latestByMae = new Map<string, AnaliseComMae>();

      (linkedData || []).forEach((item: any) => {
        let resultado_atendente = item.resultado_atendente;
        if (!resultado_atendente) {
          const status = item.status_analise?.toUpperCase();
          if (status === "APROVADA") resultado_atendente = "APROVADO";
          else if (status === "NAO_APROVAVEL") resultado_atendente = "REPROVADO";
          else resultado_atendente = "JURIDICO";
        }

        const analise: AnaliseComMae = {
          ...item,
          resultado_atendente,
          motivo_curto: item.motivo_curto || "",
        };

        if (!item.mae_id) {
          allAnalises.push(analise);
        } else {
          const existing = latestByMae.get(item.mae_id);
          if (!existing || item.versao > existing.versao) {
            latestByMae.set(item.mae_id, analise);
          }
        }
      });

      setAnalises([...allAnalises, ...Array.from(latestByMae.values())]);
    } catch (error) {
      console.error("Erro ao buscar análises:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAnalises = useMemo(() => {
    return analises.filter((analise) => {
      const searchLower = searchQuery.toLowerCase();
      const nomeMae = analise.mae_processo?.nome_mae || analise.nome_temporario || "";
      const cpf = analise.mae_processo?.cpf || "";
      
      const matchesSearch =
        !searchQuery ||
        nomeMae.toLowerCase().includes(searchLower) ||
        cpf.includes(searchQuery.replace(/\D/g, ""));

      const normalizedStatus = analise.status_analise?.toUpperCase();
      const matchesStatus = statusFilter === "all" || normalizedStatus === statusFilter;

      const matchesCategoria =
        categoriaFilter === "all" ||
        analise.categoria_identificada?.toLowerCase() === categoriaFilter;

      const hasBlockingRisk = analise.riscos_identificados?.some(
        (r) => r.nivel === "BLOQUEIO"
      );
      const hasAlertRisk = analise.riscos_identificados?.some(
        (r) => r.nivel === "ALERTA"
      );

      let matchesRisco = true;
      if (riscoFilter === "bloqueio") matchesRisco = hasBlockingRisk;
      else if (riscoFilter === "alerta") matchesRisco = hasAlertRisk && !hasBlockingRisk;
      else if (riscoFilter === "nenhum") matchesRisco = !hasBlockingRisk && !hasAlertRisk;

      return matchesSearch && matchesStatus && matchesCategoria && matchesRisco;
    });
  }, [analises, searchQuery, statusFilter, categoriaFilter, riscoFilter]);

  const stats = useMemo(() => {
    const total = analises.length;
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
  }, [analises]);

  const getResultConfig = (resultado: string, status: string) => {
    const normalizedStatus = status?.toUpperCase();
    if (resultado === "APROVADO" || normalizedStatus === "APROVADA") {
      return {
        icon: CheckCircle2,
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-950/30",
        label: "Elegível",
      };
    }
    if (resultado === "REPROVADO" || normalizedStatus === "NAO_APROVAVEL") {
      return {
        icon: XCircle,
        color: "text-rose-600 dark:text-rose-400",
        bg: "bg-rose-50 dark:bg-rose-950/30",
        label: "Não Elegível",
      };
    }
    return {
      icon: Scale,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      label: "Jurídico",
    };
  };

  const formatCpf = (cpf: string) => {
    const numbers = cpf.replace(/\D/g, "");
    return numbers
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const handleRowClickAdmin = (analise: AnaliseComMae) => {
    if (!analise.mae_id || !analise.mae_processo) {
      if (analise.resultado_atendente === "APROVADO" || analise.resultado_atendente === "JURIDICO") {
        setSelectedAnaliseForRegister(analise);
        setMaeDialogOpen(true);
      }
      return;
    }

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
    setSelectedMaeHistorico(mae);
    setHistoricoDialogOpen(true);
  };

  const handleMaeRegistered = async () => {
    setMaeDialogOpen(false);
    setSelectedAnaliseForRegister(null);
    fetchAnalises();
  };

  if (authLoading || isAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // ========== VISÃO ATENDENTE ==========
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <Header searchQuery="" onSearchChange={() => {}} />

        <main className="container mx-auto px-4 py-8 max-w-md">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/")}
              className="gap-1 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </div>

          <NovaPreAnaliseForm />
        </main>
      </div>
    );
  }

  // ========== VISÃO ADMIN ==========
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Header searchQuery="" onSearchChange={() => {}} />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                Pré-Análises
              </h1>
              <p className="text-sm text-muted-foreground">
                Gestão de análises de elegibilidade
              </p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5 border-primary/30 text-primary">
            <Scale className="h-3.5 w-3.5" />
            Admin
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard 
            label="Total" 
            value={stats.total} 
            icon={FileText}
          />
          <StatCard 
            label="Elegíveis" 
            value={stats.aprovadas} 
            icon={TrendingUp}
            variant="success"
          />
          <StatCard 
            label="Ressalvas" 
            value={stats.ressalvas} 
            icon={Clock}
            variant="warning"
          />
          <StatCard 
            label="Não Elegíveis" 
            value={stats.reprovadas} 
            icon={TrendingDown}
            variant="danger"
          />
          <StatCard 
            label="Com Bloqueio" 
            value={stats.comBloqueio} 
            icon={AlertTriangle}
            variant="danger"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="APROVADA">Elegíveis</SelectItem>
                <SelectItem value="APROVADA_COM_RESSALVAS">Ressalvas</SelectItem>
                <SelectItem value="NAO_APROVAVEL">Não Elegíveis</SelectItem>
              </SelectContent>
            </Select>

            <Select value={riscoFilter} onValueChange={setRiscoFilter}>
              <SelectTrigger className="w-[140px] h-10">
                <SelectValue placeholder="Riscos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="bloqueio">Com Bloqueio</SelectItem>
                <SelectItem value="alerta">Com Alertas</SelectItem>
                <SelectItem value="nenhum">Sem Riscos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lista de Análises */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredAnalises.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Brain className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">Nenhuma análise encontrada</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {analises.length === 0
                  ? "Ainda não há pré-análises realizadas no sistema."
                  : "Tente ajustar os filtros de busca."}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="divide-y">
                {filteredAnalises.map((analise) => {
                  const config = getResultConfig(
                    analise.resultado_atendente || "",
                    analise.status_analise
                  );
                  const IconComponent = config.icon;
                  const isStandalone = !analise.mae_id;
                  const nomeMae = analise.mae_processo?.nome_mae || analise.nome_temporario || "Análise Avulsa";
                  const cpf = analise.mae_processo?.cpf || "";
                  const canRegister = isStandalone && 
                    (analise.resultado_atendente === "APROVADO" || analise.resultado_atendente === "JURIDICO");
                  const bloqueios = analise.riscos_identificados?.filter(
                    (r) => r.nivel === "BLOQUEIO"
                  ).length || 0;
                  const alertas = analise.riscos_identificados?.filter(
                    (r) => r.nivel === "ALERTA"
                  ).length || 0;

                  return (
                    <div
                      key={analise.id}
                      className={cn(
                        "flex items-center gap-4 p-4 cursor-pointer transition-colors hover:bg-muted/50",
                        isStandalone && "bg-primary/5"
                      )}
                      onClick={() => handleRowClickAdmin(analise)}
                    >
                      {/* Status Icon */}
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", config.bg)}>
                        <IconComponent className={cn("h-5 w-5", config.color)} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{nomeMae}</span>
                          {isStandalone && (
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              Avulsa
                            </Badge>
                          )}
                          {canRegister && (
                            <Badge className="text-[10px] bg-primary/20 text-primary shrink-0 gap-1">
                              <UserPlus className="h-3 w-3" />
                              Cadastrar
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {cpf && <span className="font-mono">{formatCpf(cpf)}</span>}
                          <span>v{analise.versao}</span>
                          {analise.processado_em && (
                            <span>
                              {format(new Date(analise.processado_em), "dd/MM/yy", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Riscos */}
                      <div className="flex items-center gap-2 shrink-0">
                        {bloqueios > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {bloqueios} bloqueio{bloqueios > 1 ? "s" : ""}
                          </Badge>
                        )}
                        {alertas > 0 && (
                          <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                            {alertas} alerta{alertas > 1 ? "s" : ""}
                          </Badge>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </main>

      {/* Dialogs */}
      {selectedMaeHistorico && (
        <PreAnaliseHistoricoDialog
          open={historicoDialogOpen}
          onOpenChange={setHistoricoDialogOpen}
          mae={selectedMaeHistorico}
        />
      )}

      <MaeFormDialog
        open={maeDialogOpen}
        onOpenChange={setMaeDialogOpen}
        onSuccess={handleMaeRegistered}
      />
    </div>
  );
}

// Componente auxiliar para Stats
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "success" | "warning" | "danger";
}

function StatCard({ label, value, icon: Icon, variant = "default" }: StatCardProps) {
  const variantStyles = {
    default: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-rose-600 dark:text-rose-400",
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-4 w-4", variantStyles[variant])} />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-2xl font-bold", variantStyles[variant])}>{value}</p>
    </div>
  );
}
