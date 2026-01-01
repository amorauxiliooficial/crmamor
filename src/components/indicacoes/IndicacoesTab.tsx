import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import { Indicacao, StatusAbordagem, statusAbordagemLabels, statusAbordagemColors, ProximaAcao, proximaAcaoLabels, proximaAcaoColors, motivoAbordagemLabels, MotivoAbordagem } from "@/types/indicacao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndicacaoDialog } from "./IndicacaoDialog";
import { IndicacaoFormDialog } from "./IndicacaoFormDialog";
import { Plus, Phone, Search, Users, Clock, CheckCircle, Loader2, PlayCircle } from "lucide-react";
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

  useEffect(() => {
    if (user) {
      fetchIndicacoes();
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

  const handleRowClick = (indicacao: Indicacao) => {
    setSelectedIndicacao(indicacao);
    setEditDialogOpen(true);
  };

  const handleStatusChange = async (indicacaoId: string, status: StatusAbordagem, e: React.MouseEvent) => {
    e.stopPropagation();
    
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
      // Registrar ação
      await supabase.from("acoes_indicacao").insert({
        indicacao_id: indicacaoId,
        tipo_acao: `Status: ${statusAbordagemLabels[status]}`,
        user_id: user!.id,
      });
      fetchIndicacoes();
    }
  };

  const handleProximaAcao = async (indicacaoId: string, acao: ProximaAcao, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { error } = await supabase
      .from("indicacoes")
      .update({ 
        proxima_acao: acao,
        status_abordagem: "em_andamento"
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
      // Registrar ação
      await supabase.from("acoes_indicacao").insert({
        indicacao_id: indicacaoId,
        tipo_acao: `Ação: ${proximaAcaoLabels[acao]}`,
        user_id: user!.id,
      });
      toast({
        title: "Ação registrada",
        description: `${proximaAcaoLabels[acao]} registrado com sucesso.`,
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
              <TableHead>Próxima Ação</TableHead>
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
                  onClick={() => handleRowClick(indicacao)}
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
                  <TableCell>
                    <div className="flex gap-1">
                      {(["pendente", "em_andamento", "concluido"] as StatusAbordagem[]).map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={indicacao.status_abordagem === status ? "default" : "outline"}
                          className={`text-xs px-2 py-1 h-7 ${indicacao.status_abordagem === status ? statusAbordagemColors[status] : ""}`}
                          onClick={(e) => handleStatusChange(indicacao.id, status, e)}
                        >
                          {statusAbordagemLabels[status]}
                        </Button>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[150px]">
                    {indicacao.motivo_abordagem 
                      ? motivoAbordagemLabels[indicacao.motivo_abordagem as MotivoAbordagem] || indicacao.motivo_abordagem
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={indicacao.proxima_acao === "primeiro_contato" ? "default" : "outline"}
                        className={`text-xs px-2 py-1 h-7 ${indicacao.proxima_acao === "primeiro_contato" ? proximaAcaoColors.primeiro_contato : ""}`}
                        onClick={(e) => handleProximaAcao(indicacao.id, "primeiro_contato", e)}
                      >
                        1º Contato
                      </Button>
                      <Button
                        size="sm"
                        variant={indicacao.proxima_acao === "follow_up" ? "default" : "outline"}
                        className={`text-xs px-2 py-1 h-7 ${indicacao.proxima_acao === "follow_up" ? proximaAcaoColors.follow_up : ""}`}
                        onClick={(e) => handleProximaAcao(indicacao.id, "follow_up", e)}
                      >
                        Follow Up
                      </Button>
                      <Button
                        size="sm"
                        variant={indicacao.proxima_acao === "proxima_acao" ? "default" : "outline"}
                        className={`text-xs px-2 py-1 h-7 ${indicacao.proxima_acao === "proxima_acao" ? proximaAcaoColors.proxima_acao : ""}`}
                        onClick={(e) => handleProximaAcao(indicacao.id, "proxima_acao", e)}
                      >
                        Próx. Ação
                      </Button>
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