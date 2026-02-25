import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import {
  Indicacao,
  StatusAbordagem,
  statusAbordagemLabels,
  statusAbordagemColors,
  motivoAbordagemLabels,
  MotivoAbordagem,
  origemIndicacaoLabels,
  origemIndicacaoColors,
  OrigemIndicacao,
} from "@/types/indicacao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { IndicacaoDetailPanel } from "./IndicacaoDetailPanel";
import { IndicacaoFormDialog } from "./IndicacaoFormDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Plus,
  Phone,
  Search,
  Users,
  Clock,
  CheckCircle,
  Loader2,
  PlayCircle,
  AlertCircle,
  ExternalLink,
  MoreHorizontal,
  MessageSquare,
  UserPlus,
  CalendarPlus,
  Eye,
  Copy,
  Check,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface IndicacoesTabProps {
  searchQuery?: string;
  externalSelectedIndicacao?: Indicacao | null;
  onClearExternalSelection?: () => void;
  selectedUserId?: string;
}

export function IndicacoesTab({ searchQuery = "", externalSelectedIndicacao, onClearExternalSelection, selectedUserId }: IndicacoesTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndicacao, setSelectedIndicacao] = useState<Indicacao | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [userProfile, setUserProfile] = useState<{ full_name: string | null } | null>(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const userId = user?.id;

  // Open indicacao from URL param
  const openIndicacaoFromParam = useCallback((indicacaoList: Indicacao[]) => {
    const indicacaoId = searchParams.get("indicacao");
    if (indicacaoId && indicacaoList.length > 0) {
      const found = indicacaoList.find((i) => i.id === indicacaoId);
      if (found) {
        setSelectedIndicacao(found);
        setPanelOpen(true);
      }
    }
  }, [searchParams]);

  // Handle external selection from notification
  useEffect(() => {
    if (externalSelectedIndicacao) {
      setSelectedIndicacao(externalSelectedIndicacao);
      setPanelOpen(true);
      // Update URL
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("indicacao", externalSelectedIndicacao.id);
        return next;
      });
      onClearExternalSelection?.();
    }
  }, [externalSelectedIndicacao, onClearExternalSelection, setSearchParams]);

  const fetchIndicacoes = async () => {
    if (!userId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("indicacoes")
      .select("*")
      .order("data_indicacao", { ascending: false });

    if (error) {
      logError("fetch_indicacoes", error);
      toast({ variant: "destructive", title: "Erro ao carregar indicações", description: getUserFriendlyError(error) });
    } else if (data) {
      const typedData = data as Indicacao[];
      setIndicacoes(typedData);
      openIndicacaoFromParam(typedData);
    }
    setLoading(false);
  };

  const fetchUserProfile = async () => {
    if (!userId) return;
    const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
    if (data) setUserProfile(data);
  };

  useEffect(() => {
    if (userId) {
      fetchIndicacoes();
      fetchUserProfile();
    }
  }, [userId]);

  const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filteredIndicacoes = useMemo(() => {
    let filtered = indicacoes;

    if (selectedUserId && selectedUserId !== "all") {
      filtered = filtered.filter((ind) => ind.user_id === selectedUserId);
    }

    const query = removeAccents((searchQuery || localSearch).toLowerCase().trim());
    if (query) {
      filtered = filtered.filter((ind) => {
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
    }

    return filtered;
  }, [indicacoes, searchQuery, localSearch, selectedUserId]);

  const stats = useMemo(() => {
    const d = filteredIndicacoes;
    return {
      total: d.length,
      aguardandoAprovacao: d.filter((i) => i.status_abordagem === "aguardando_aprovacao").length,
      pendentes: d.filter((i) => i.status_abordagem === "pendente").length,
      emAndamento: d.filter((i) => i.status_abordagem === "em_andamento").length,
      concluidos: d.filter((i) => i.status_abordagem === "concluido").length,
      externas: d.filter((i) => i.origem_indicacao === "externa").length,
    };
  }, [filteredIndicacoes]);

  const handleRowClick = (indicacao: Indicacao) => {
    setSelectedIndicacao(indicacao);
    setPanelOpen(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("indicacao", indicacao.id);
      return next;
    });
  };

  const handlePanelClose = (open: boolean) => {
    setPanelOpen(open);
    if (!open) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("indicacao");
        return next;
      });
    }
  };

  const handleStatusChange = async (indicacaoId: string, status: StatusAbordagem) => {
    const userName = userProfile?.full_name || user?.email || "Usuário";

    const { error } = await supabase.from("indicacoes").update({ status_abordagem: status }).eq("id", indicacaoId);

    if (error) {
      logError("update_status", error);
      toast({ variant: "destructive", title: "Erro ao atualizar", description: getUserFriendlyError(error) });
    } else {
      await supabase.from("acoes_indicacao").insert({
        indicacao_id: indicacaoId,
        tipo_acao: `Status: ${statusAbordagemLabels[status]}`,
        observacao: `Por: ${userName}`,
        user_id: user!.id,
      });
      toast({ title: "Status atualizado" });
      fetchIndicacoes();
    }
  };

  const handleMotivoChange = async (indicacaoId: string, motivo: MotivoAbordagem) => {
    const userName = userProfile?.full_name || user?.email || "Usuário";

    const { error } = await supabase.from("indicacoes").update({ motivo_abordagem: motivo }).eq("id", indicacaoId);

    if (error) {
      logError("update_motivo", error);
      toast({ variant: "destructive", title: "Erro ao atualizar", description: getUserFriendlyError(error) });
    } else {
      await supabase.from("acoes_indicacao").insert({
        indicacao_id: indicacaoId,
        tipo_acao: `Motivo: ${motivoAbordagemLabels[motivo]}`,
        observacao: `Por: ${userName}`,
        user_id: user!.id,
      });
      toast({ title: "Motivo atualizado" });
      fetchIndicacoes();
    }
  };

  const handleCopyPhone = async (phone: string, id: string) => {
    await navigator.clipboard.writeText(phone);
    setCopiedPhoneId(id);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  const sanitizePhone = (phone: string | undefined | null): string => {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
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
            {stats.externas > 0 && <p className="text-xs text-muted-foreground">{stats.externas} externas</p>}
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
              <TableHead className="w-[50px]"></TableHead>
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
                const phone = sanitizePhone(indicacao.telefone_indicada);
                return (
                  <TableRow
                    key={indicacao.id}
                    className={`cursor-pointer hover:bg-muted/50 ${selectedIndicacao?.id === indicacao.id && panelOpen ? "bg-muted" : ""}`}
                    onClick={() => handleRowClick(indicacao)}
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
                      <Badge variant="secondary" className={`text-xs ${origemIndicacaoColors[origem]}`}>
                        {origem === "externa" && <ExternalLink className="h-3 w-3 mr-1" />}
                        {origemIndicacaoLabels[origem]}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {indicacao.telefone_indicada && (
                        <TooltipProvider>
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a
                                  href={`https://wa.me/${phone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-emerald-600 hover:underline text-sm"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                  {indicacao.telefone_indicada}
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>Abrir WhatsApp</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleCopyPhone(indicacao.telefone_indicada!, indicacao.id)}
                                >
                                  {copiedPhoneId === indicacao.id ? (
                                    <Check className="h-3 w-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copiar telefone</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
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
                            <SelectItem key={value} value={value}>{label}</SelectItem>
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
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRowClick(indicacao)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          {phone && (
                            <>
                              <DropdownMenuItem onClick={() => window.open(`https://wa.me/${phone}`, "_blank")}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                WhatsApp
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(`tel:+${phone}`, "_self")}>
                                <Phone className="h-4 w-4 mr-2" />
                                Ligar
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedIndicacao(indicacao);
                              setPanelOpen(true);
                              // The convert action is inside the panel
                            }}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Converter em Processo
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedIndicacao(indicacao);
                              setPanelOpen(true);
                            }}
                          >
                            <CalendarPlus className="h-4 w-4 mr-2" />
                            Criar atividade
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
      </div>

      <IndicacaoDetailPanel
        indicacao={selectedIndicacao}
        open={panelOpen}
        onOpenChange={handlePanelClose}
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
