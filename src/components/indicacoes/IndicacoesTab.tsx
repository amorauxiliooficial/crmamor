import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import { Indicacao, StatusAbordagem, statusAbordagemLabels, motivoAbordagemLabels, MotivoAbordagem, proximaAcaoLabels, ProximaAcao } from "@/types/indicacao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { IndicacaoDialog } from "./IndicacaoDialog";
import { IndicacaoFormDialog } from "./IndicacaoFormDialog";
import { AcaoPopover } from "./AcaoPopover";
import { Plus, Phone, Search, Users, Clock, CheckCircle, Loader2, PlayCircle, CalendarClock, AlertTriangle, Bell } from "lucide-react";
import { format, parseISO, isPast, isToday, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

interface IndicacoesTabProps {
  searchQuery?: string;
}

export function IndicacoesTab({ searchQuery = "" }: IndicacoesTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndicacao, setSelectedIndicacao] = useState<Indicacao | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [userProfile, setUserProfile] = useState<{ full_name: string | null } | null>(null);

  const fetchIndicacoes = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("indicacoes")
      .select("*")
      .order("data_indicacao", { ascending: false });

    if (error) {
      logError("fetch_indicacoes", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar indicações",
        description: getUserFriendlyError(error),
      });
    } else if (data) {
      setIndicacoes(data as Indicacao[]);
    }
    setLoading(false);
  };

  const fetchUserProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    
    if (data) {
      setUserProfile(data);
    }
  };

  useEffect(() => {
    if (user) {
      fetchIndicacoes();
      fetchUserProfile();
    }
  }, [user]);

  const removeAccents = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const filteredIndicacoes = useMemo(() => {
    const query = removeAccents((searchQuery || localSearch).toLowerCase().trim());
    if (!query) return indicacoes;

    return indicacoes.filter((ind) => {
      const normalizedNomeIndicada = removeAccents(ind.nome_indicada?.toLowerCase() || "");
      const normalizedNomeIndicadora = removeAccents(ind.nome_indicadora?.toLowerCase() || "");
      const phoneIndicada = ind.telefone_indicada?.replace(/\D/g, "") || "";
      const phoneIndicadora = ind.telefone_indicadora?.replace(/\D/g, "") || "";
      const queryDigits = query.replace(/\D/g, "");

      return (
        normalizedNomeIndicada.includes(query) ||
        normalizedNomeIndicadora.includes(query) ||
        (queryDigits.length > 0 && (phoneIndicada.includes(queryDigits) || phoneIndicadora.includes(queryDigits)))
      );
    });
  }, [indicacoes, searchQuery, localSearch]);

  const stats = useMemo(() => {
    return {
      total: indicacoes.length,
      pendentes: indicacoes.filter((i) => i.status_abordagem === "pendente").length,
      emAndamento: indicacoes.filter((i) => i.status_abordagem === "em_andamento").length,
      concluidos: indicacoes.filter((i) => i.status_abordagem === "concluido").length,
    };
  }, [indicacoes]);

  // Identificar tarefas atrasadas e próximas
  const tarefasStatus = useMemo(() => {
    const agora = new Date();
    const atrasadas: Indicacao[] = [];
    const proximas: Indicacao[] = []; // Próximas 2 horas

    indicacoes.forEach((ind) => {
      if (ind.proxima_acao_data && ind.status_abordagem !== "concluido") {
        const dataAcao = parseISO(ind.proxima_acao_data);
        if (isPast(dataAcao)) {
          atrasadas.push(ind);
        } else if (differenceInMinutes(dataAcao, agora) <= 120) {
          proximas.push(ind);
        }
      }
    });

    return { atrasadas, proximas };
  }, [indicacoes]);

  const getProximaAcaoStatus = (indicacao: Indicacao) => {
    if (!indicacao.proxima_acao_data) return null;
    const dataAcao = parseISO(indicacao.proxima_acao_data);
    const agora = new Date();
    
    if (isPast(dataAcao)) {
      return "atrasada";
    } else if (differenceInMinutes(dataAcao, agora) <= 120) {
      return "proxima";
    }
    return "agendada";
  };

  const handleRowClick = (indicacao: Indicacao, e: React.MouseEvent) => {
    // Prevent opening dialog when clicking on select or dropdown
    const target = e.target as HTMLElement;
    if (target.closest('[data-radix-collection-item]') || target.closest('[role="combobox"]') || target.closest('[role="menuitem"]') || target.closest('button')) {
      return;
    }
    setSelectedIndicacao(indicacao);
    setEditDialogOpen(true);
  };

  const handleStatusChange = async (indicacaoId: string, status: StatusAbordagem) => {
    const userName = userProfile?.full_name || user?.email || "Usuário";
    
    const { error } = await supabase
      .from("indicacoes")
      .update({ status_abordagem: status })
      .eq("id", indicacaoId);

    if (error) {
      logError("update_status", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: getUserFriendlyError(error),
      });
    } else {
      await supabase.from("acoes_indicacao").insert({
        indicacao_id: indicacaoId,
        tipo_acao: `Status: ${statusAbordagemLabels[status]}`,
        observacao: `Por: ${userName}`,
        user_id: user!.id,
      });
      fetchIndicacoes();
    }
  };

  const handleMotivoChange = async (indicacaoId: string, motivo: MotivoAbordagem) => {
    const userName = userProfile?.full_name || user?.email || "Usuário";
    
    const { error } = await supabase
      .from("indicacoes")
      .update({ motivo_abordagem: motivo })
      .eq("id", indicacaoId);

    if (error) {
      logError("update_motivo", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: getUserFriendlyError(error),
      });
    } else {
      await supabase.from("acoes_indicacao").insert({
        indicacao_id: indicacaoId,
        tipo_acao: `Motivo: ${motivoAbordagemLabels[motivo]}`,
        observacao: `Por: ${userName}`,
        user_id: user!.id,
      });
      fetchIndicacoes();
    }
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
      {/* Alerta de Tarefas Atrasadas */}
      {tarefasStatus.atrasadas.length > 0 && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {tarefasStatus.atrasadas.length} tarefa(s) atrasada(s)!
          </AlertTitle>
          <AlertDescription className="mt-2">
            <div className="flex flex-wrap gap-2">
              {tarefasStatus.atrasadas.slice(0, 5).map((ind) => (
                <Badge 
                  key={ind.id} 
                  variant="destructive"
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedIndicacao(ind);
                    setEditDialogOpen(true);
                  }}
                >
                  {ind.nome_indicada} - {ind.proxima_acao && proximaAcaoLabels[ind.proxima_acao as ProximaAcao]}
                  {ind.proxima_acao_data && ` (${format(parseISO(ind.proxima_acao_data), "dd/MM HH:mm")})`}
                </Badge>
              ))}
              {tarefasStatus.atrasadas.length > 5 && (
                <Badge variant="outline">+{tarefasStatus.atrasadas.length - 5} mais</Badge>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta de Tarefas Próximas (próximas 2 horas) */}
      {tarefasStatus.proximas.length > 0 && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700 dark:text-amber-400">
            {tarefasStatus.proximas.length} tarefa(s) nas próximas 2 horas
          </AlertTitle>
          <AlertDescription className="mt-2">
            <div className="flex flex-wrap gap-2">
              {tarefasStatus.proximas.map((ind) => (
                <Badge 
                  key={ind.id} 
                  variant="outline"
                  className="border-amber-500 text-amber-700 dark:text-amber-400 cursor-pointer"
                  onClick={() => {
                    setSelectedIndicacao(ind);
                    setEditDialogOpen(true);
                  }}
                >
                  {ind.nome_indicada} - {format(parseISO(ind.proxima_acao_data!), "HH:mm")}
                </Badge>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-muted-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendentes}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PlayCircle className="h-4 w-4" />
              Em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emAndamento}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Concluídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.concluidos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setFormDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Indicação
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Indicada</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Indicadora</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredIndicacoes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma indicação encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredIndicacoes.map((indicacao) => (
                <TableRow
                  key={indicacao.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={(e) => handleRowClick(indicacao, e)}
                >
                  <TableCell className="whitespace-nowrap">
                    {format(parseISO(indicacao.data_indicacao), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="font-medium">{indicacao.nome_indicada}</TableCell>
                  <TableCell>
                    {indicacao.telefone_indicada && (
                      <a
                        href={`https://wa.me/${indicacao.telefone_indicada.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-emerald-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3 w-3" />
                        {indicacao.telefone_indicada}
                      </a>
                    )}
                  </TableCell>
                  <TableCell>{indicacao.nome_indicadora || "-"}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={indicacao.status_abordagem}
                      onValueChange={(value) => handleStatusChange(indicacao.id, value as StatusAbordagem)}
                    >
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusAbordagemLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={indicacao.motivo_abordagem || ""}
                      onValueChange={(value) => handleMotivoChange(indicacao.id, value as MotivoAbordagem)}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(motivoAbordagemLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div 
                      className="flex flex-col gap-1"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <AcaoPopover 
                        indicacaoId={indicacao.id} 
                        onSuccess={fetchIndicacoes}
                      />
                      {indicacao.proxima_acao && indicacao.proxima_acao_data && (
                        <div className="flex items-center gap-1">
                          {getProximaAcaoStatus(indicacao) === "atrasada" && (
                            <Badge variant="destructive" className="text-[10px] px-1 py-0 h-5 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              ATRASADA
                            </Badge>
                          )}
                          {getProximaAcaoStatus(indicacao) === "proxima" && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 border-amber-500 text-amber-600 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              EM BREVE
                            </Badge>
                          )}
                          <span className={`text-xs flex items-center gap-1 ${
                            getProximaAcaoStatus(indicacao) === "atrasada" 
                              ? "text-destructive font-medium" 
                              : getProximaAcaoStatus(indicacao) === "proxima"
                                ? "text-amber-600 font-medium"
                                : "text-muted-foreground"
                          }`}>
                            <CalendarClock className="h-3 w-3" />
                            {format(parseISO(indicacao.proxima_acao_data), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <IndicacaoDialog
        indicacao={selectedIndicacao}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={fetchIndicacoes}
      />

      <IndicacaoFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onSuccess={fetchIndicacoes}
      />
    </div>
  );
}