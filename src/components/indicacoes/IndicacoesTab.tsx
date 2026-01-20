import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import { Indicacao, StatusAbordagem, statusAbordagemLabels, motivoAbordagemLabels, MotivoAbordagem, origemIndicacaoLabels, origemIndicacaoColors, OrigemIndicacao } from "@/types/indicacao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { IndicacaoDialog } from "./IndicacaoDialog";
import { IndicacaoFormDialog } from "./IndicacaoFormDialog";
import { AcaoPopover } from "./AcaoPopover";
import { Plus, Phone, Search, Users, Clock, CheckCircle, Loader2, PlayCircle, AlertCircle, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface IndicacoesTabProps {
  searchQuery?: string;
  externalSelectedIndicacao?: Indicacao | null;
  onClearExternalSelection?: () => void;
}

export function IndicacoesTab({ searchQuery = "", externalSelectedIndicacao, onClearExternalSelection }: IndicacoesTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndicacao, setSelectedIndicacao] = useState<Indicacao | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [userProfile, setUserProfile] = useState<{ full_name: string | null } | null>(null);

  // Handle external selection from notification
  useEffect(() => {
    if (externalSelectedIndicacao) {
      setSelectedIndicacao(externalSelectedIndicacao);
      setEditDialogOpen(true);
      onClearExternalSelection?.();
    }
  }, [externalSelectedIndicacao, onClearExternalSelection]);

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
      aguardandoAprovacao: indicacoes.filter((i) => i.status_abordagem === "aguardando_aprovacao").length,
      pendentes: indicacoes.filter((i) => i.status_abordagem === "pendente").length,
      emAndamento: indicacoes.filter((i) => i.status_abordagem === "em_andamento").length,
      concluidos: indicacoes.filter((i) => i.status_abordagem === "concluido").length,
      externas: indicacoes.filter((i) => i.origem_indicacao === "externa").length,
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Aguardando
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.aguardandoAprovacao}</div>
            {stats.externas > 0 && (
              <p className="text-xs text-muted-foreground">{stats.externas} externas</p>
            )}
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
              <TableHead>Origem</TableHead>
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
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhuma indicação encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredIndicacoes.map((indicacao) => {
                const origem = (indicacao.origem_indicacao || "interna") as OrigemIndicacao;
                return (
                  <TableRow
                    key={indicacao.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={(e) => handleRowClick(indicacao, e)}
                  >
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-col">
                        <span>{format(parseISO(indicacao.data_indicacao), "dd/MM/yyyy", { locale: ptBR })}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(indicacao.data_indicacao), "HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{indicacao.nome_indicada}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${origemIndicacaoColors[origem]}`}
                      >
                        {origem === "externa" && <ExternalLink className="h-3 w-3 mr-1" />}
                        {origemIndicacaoLabels[origem]}
                      </Badge>
                    </TableCell>
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
                        <SelectTrigger className="w-[150px] h-8 text-xs">
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
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
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