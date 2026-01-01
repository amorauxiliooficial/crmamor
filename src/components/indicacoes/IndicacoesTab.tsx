import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import { Indicacao, StatusAbordagem, statusAbordagemLabels, ProximaAcao, proximaAcaoLabels, motivoAbordagemLabels, MotivoAbordagem } from "@/types/indicacao";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IndicacaoDialog } from "./IndicacaoDialog";
import { IndicacaoFormDialog } from "./IndicacaoFormDialog";
import { Plus, Phone, Search, Users, Clock, CheckCircle, Loader2, PlayCircle, CalendarClock, ChevronDown } from "lucide-react";
import { format, parseISO } from "date-fns";
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

  const handleProximaAcao = async (indicacaoId: string, acao: ProximaAcao) => {
    const userName = userProfile?.full_name || user?.email || "Usuário";
    const now = new Date();
    
    const { error } = await supabase
      .from("indicacoes")
      .update({ 
        proxima_acao: acao,
        status_abordagem: "em_andamento",
        proxima_acao_data: now.toISOString(),
      })
      .eq("id", indicacaoId);

    if (error) {
      logError("update_proxima_acao", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: getUserFriendlyError(error),
      });
    } else {
      await supabase.from("acoes_indicacao").insert({
        indicacao_id: indicacaoId,
        tipo_acao: `Ação: ${proximaAcaoLabels[acao]}`,
        observacao: `Por: ${userName}`,
        user_id: user!.id,
      });
      toast({
        title: "Ação registrada",
        description: `${proximaAcaoLabels[acao]} registrado em ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} por ${userName}.`,
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
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            Ação
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleProximaAcao(indicacao.id, "primeiro_contato")}>
                            1º Contato
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleProximaAcao(indicacao.id, "follow_up")}>
                            Follow Up
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {indicacao.proxima_acao && indicacao.proxima_acao_data && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" />
                          {format(parseISO(indicacao.proxima_acao_data), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
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