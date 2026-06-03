import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import { formatBrazilPhone } from "@/lib/formatBrazilPhone";
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
import { IndicacaoMobileList } from "./IndicacaoMobileList";
import { ConvertToProcessDialog, type FunilOption } from "./ConvertToProcessDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  UserCheck,
  UserX,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProfileOption {
  id: string;
  full_name: string | null;
  email: string | null;
}

const UNASSIGNED_VALUE = "__unassigned__";

function getInitials(name: string | null | undefined, fallback?: string | null) {
  const source = (name || fallback || "?").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface IndicacoesTabProps {
  searchQuery?: string;
  externalSelectedIndicacao?: Indicacao | null;
  onClearExternalSelection?: () => void;
  selectedUserId?: string;
}

export function IndicacoesTab({ searchQuery = "", externalSelectedIndicacao, onClearExternalSelection, selectedUserId }: IndicacoesTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertTarget, setConvertTarget] = useState<Indicacao | null>(null);
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndicacao, setSelectedIndicacao] = useState<Indicacao | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [userProfile, setUserProfile] = useState<{ full_name: string | null } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
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

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name", { ascending: true });
    if (error) {
      logError("fetch_profiles", error);
    } else if (data) {
      setProfiles(data as ProfileOption[]);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchIndicacoes();
      fetchUserProfile();
      fetchProfiles();
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
    const previous = indicacoes;
    // Optimistic
    setIndicacoes((prev) =>
      prev.map((i) => (i.id === indicacaoId ? { ...i, status_abordagem: status } : i)),
    );

    const { error } = await supabase.from("indicacoes").update({ status_abordagem: status }).eq("id", indicacaoId);

    if (error) {
      setIndicacoes(previous);
      logError("update_status", error);
      toast({ variant: "destructive", title: "Erro ao atualizar", description: getUserFriendlyError(error) });
      return;
    }
    await supabase.from("acoes_indicacao").insert({
      indicacao_id: indicacaoId,
      tipo_acao: `Status: ${statusAbordagemLabels[status]}`,
      observacao: `Por: ${userName}`,
      user_id: user!.id,
    });
    toast({ title: "Status atualizado" });
  };

  const handleMotivoChange = async (indicacaoId: string, motivo: MotivoAbordagem) => {
    const userName = userProfile?.full_name || user?.email || "Usuário";
    const previous = indicacoes;
    setIndicacoes((prev) =>
      prev.map((i) => (i.id === indicacaoId ? { ...i, motivo_abordagem: motivo } : i)),
    );

    const { error } = await supabase.from("indicacoes").update({ motivo_abordagem: motivo }).eq("id", indicacaoId);

    if (error) {
      setIndicacoes(previous);
      logError("update_motivo", error);
      toast({ variant: "destructive", title: "Erro ao atualizar", description: getUserFriendlyError(error) });
      return;
    }
    await supabase.from("acoes_indicacao").insert({
      indicacao_id: indicacaoId,
      tipo_acao: `Motivo: ${motivoAbordagemLabels[motivo]}`,
      observacao: `Por: ${userName}`,
      user_id: user!.id,
    });
    toast({ title: "Motivo atualizado" });
  };

  const handleCopy = async (text: string, id: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: `${label} copiado` });
    setTimeout(() => setCopiedId(null), 1500);
  };

  const sanitizePhone = (phone: string | undefined | null): string => {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
  };

  const handleAssignUser = async (indicacaoId: string, newUserId: string | null) => {
    const previous = indicacoes;
    // Optimistic update
    setIndicacoes((prev) =>
      prev.map((i) => (i.id === indicacaoId ? { ...i, assigned_user_id: newUserId } : i)),
    );

    const { error } = await supabase
      .from("indicacoes")
      .update({ assigned_user_id: newUserId } as never)
      .eq("id", indicacaoId);

    if (error) {
      // Rollback
      setIndicacoes(previous);
      logError("update_assigned_user", error);
      toast({ variant: "destructive", title: "Erro ao atribuir", description: getUserFriendlyError(error) });
      return;
    }

    const assigneeName =
      newUserId === null
        ? "Ninguém"
        : profiles.find((p) => p.id === newUserId)?.full_name ||
          profiles.find((p) => p.id === newUserId)?.email ||
          "Usuário";
    const actorName = userProfile?.full_name || user?.email || "Usuário";
    await supabase.from("acoes_indicacao").insert({
      indicacao_id: indicacaoId,
      tipo_acao: `Responsável: ${assigneeName}`,
      observacao: `Por: ${actorName}`,
      user_id: user!.id,
    });
    toast({ title: newUserId === user?.id ? "Você assumiu a indicação" : "Responsável atualizado" });
  };

  const openConvertDialog = (indicacao: Indicacao) => {
    setConvertTarget(indicacao);
    setConvertDialogOpen(true);
  };

  const handleConvertToProcess = async (
    indicacao: Indicacao,
    payload: import("./ConvertToProcessDialog").ConvertPayload,
  ) => {
    if (!user) throw new Error("Não autenticado");
    setConvertingId(indicacao.id);

    try {
      // 1) Prevent duplicates by referral
      const { data: existing, error: existingErr } = await supabase
        .from("mae_processo")
        .select("id")
        .eq("referral_id" as never, indicacao.id as never)
        .maybeSingle();

      if (existingErr) {
        logError("check_existing_process", existingErr);
        toast({ variant: "destructive", title: "Erro ao verificar", description: getUserFriendlyError(existingErr) });
        throw existingErr;
      }

      if (existing?.id) {
        toast({ title: "Já convertida", description: "Esta indicação já tem um processo." });
        navigate(`/?view=kanban&mae=${existing.id}`);
        return;
      }

      // 2) Prevent duplicate CPF
      const { data: dupCpf } = await supabase
        .from("mae_processo")
        .select("id, nome_mae")
        .eq("cpf", payload.cpf)
        .maybeSingle();
      if (dupCpf) {
        toast({ variant: "destructive", title: "CPF já cadastrado", description: `Já existe um cadastro: ${dupCpf.nome_mae}` });
        throw new Error("CPF já cadastrado");
      }

      // 3) Insert new process at chosen funil stage
      const normalized = formatBrazilPhone(payload.telefone || indicacao.telefone_indicada);
      const telefoneE164 = normalized?.dial ? `+${normalized.dial}` : null;

      const { data: newMae, error: insertErr } = await supabase
        .from("mae_processo")
        .insert({
          nome_mae: payload.nome_mae,
          telefone: telefoneE164 || payload.telefone || indicacao.telefone_indicada || null,
          telefone_e164: telefoneE164,
          cpf: payload.cpf,
          senha_gov: payload.senha_gov,
          user_id: user.id,
          origem: `Indicação${indicacao.nome_indicadora ? ` de ${indicacao.nome_indicadora}` : ""}`,
          referral_id: indicacao.id,
          status_processo: payload.funil,
        } as never)
        .select("id")
        .single();

      if (insertErr || !newMae) {
        logError("convert_indicacao_insert", insertErr);
        toast({ variant: "destructive", title: "Erro ao converter", description: getUserFriendlyError(insertErr) });
        throw insertErr || new Error("Falha ao criar processo");
      }

      // 4) Optimistic: mark referral convertido locally
      setIndicacoes((prev) =>
        prev.map((i) => (i.id === indicacao.id ? { ...i, status_abordagem: "convertido" } : i)),
      );

      const { error: updateErr } = await supabase
        .from("indicacoes")
        .update({ status_abordagem: "convertido" })
        .eq("id", indicacao.id);

      if (updateErr) {
        logError("convert_indicacao_update_status", updateErr);
        toast({ variant: "destructive", title: "Processo criado, mas status não atualizado", description: getUserFriendlyError(updateErr) });
      }

      await supabase.from("acoes_indicacao").insert({
        indicacao_id: indicacao.id,
        tipo_acao: "Convertida em Processo",
        observacao: `Funil: ${payload.funil} • Processo: ${newMae.id}`,
        user_id: user.id,
      });

      toast({ title: "Indicação convertida", description: `${payload.nome_mae} entrou em "${payload.funil}".` });

      navigate(`/?view=kanban&mae=${newMae.id}`);
    } finally {
      setConvertingId(null);
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              Aguardando
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.aguardandoAprovacao}</div>
            {stats.externas > 0 && <p className="text-xs text-muted-foreground">{stats.externas} externas</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendentes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PlayCircle className="h-4 w-4 text-muted-foreground" />
              Em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emAndamento}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
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

      {/* Content: Mobile cards vs Desktop table */}
      {isMobile ? (
        <IndicacaoMobileList
          indicacoes={filteredIndicacoes}
          selectedId={selectedIndicacao?.id}
          onSelect={handleRowClick}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">Data</TableHead>
                <TableHead>Indicada</TableHead>
                <TableHead>Indicadora</TableHead>
                <TableHead className="w-[160px]">Status</TableHead>
                <TableHead className="w-[210px]">Responsável</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIndicacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma indicação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredIndicacoes.map((indicacao) => {
                  const origem = (indicacao.origem_indicacao || "interna") as OrigemIndicacao;
                  const phone = sanitizePhone(indicacao.telefone_indicada);
                  const formattedPhone = formatBrazilPhone(indicacao.telefone_indicada);
                  const formattedIndicadora = formatBrazilPhone(indicacao.telefone_indicadora);
                  const copyKeyName = `name-${indicacao.id}`;
                  const copyKeyPhone = `phone-${indicacao.id}`;
                  const copyKeyIndName = `indname-${indicacao.id}`;
                  const copyKeyIndPhone = `indphone-${indicacao.id}`;
                  return (
                    <TableRow
                      key={indicacao.id}
                      className={`cursor-pointer hover:bg-muted/50 ${selectedIndicacao?.id === indicacao.id && panelOpen ? "bg-muted" : ""}`}
                      onClick={() => handleRowClick(indicacao)}
                    >
                      <TableCell className="whitespace-nowrap text-xs">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {format(parseISO(indicacao.data_indicacao), "dd/MM/yy", { locale: ptBR })}
                          </span>
                          <span className="text-muted-foreground">
                            {format(parseISO(indicacao.data_indicacao), "HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </TableCell>

                      {/* INDICADA: nome + telefone empilhados, cada um com copy */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="font-medium truncate">{indicacao.nome_indicada}</span>
                            {origem === "externa" && (
                              <Badge variant="outline" className="h-4 px-1 text-[9px] shrink-0">
                                <ExternalLink className="h-2.5 w-2.5 mr-0.5" />
                                Ext
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 shrink-0"
                              onClick={() => handleCopy(indicacao.nome_indicada, copyKeyName, "Nome")}
                              aria-label="Copiar nome"
                            >
                              {copiedId === copyKeyName ? (
                                <Check className="h-3 w-3 text-primary" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          {indicacao.telefone_indicada && (
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-xs text-muted-foreground font-mono truncate">
                                {formattedPhone?.display || indicacao.telefone_indicada}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 shrink-0"
                                onClick={() =>
                                  handleCopy(formattedPhone?.dial || indicacao.telefone_indicada!, copyKeyPhone, "Telefone")
                                }
                                aria-label="Copiar telefone"
                              >
                                {copiedId === copyKeyPhone ? (
                                  <Check className="h-3 w-3 text-primary" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* INDICADORA: nome + telefone (referência p/ pagamento) */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {indicacao.nome_indicadora || indicacao.telefone_indicadora ? (
                          <div className="flex flex-col gap-0.5 min-w-0 text-xs">
                            {indicacao.nome_indicadora && (
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="truncate">{indicacao.nome_indicadora}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 shrink-0"
                                  onClick={() => handleCopy(indicacao.nome_indicadora!, copyKeyIndName, "Nome")}
                                  aria-label="Copiar nome da indicadora"
                                >
                                  {copiedId === copyKeyIndName ? (
                                    <Check className="h-3 w-3 text-primary" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            )}
                            {indicacao.telefone_indicadora && (
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="text-muted-foreground font-mono truncate">
                                  {formattedIndicadora?.display || indicacao.telefone_indicadora}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 shrink-0"
                                  onClick={() =>
                                    handleCopy(
                                      formattedIndicadora?.dial || indicacao.telefone_indicadora!,
                                      copyKeyIndPhone,
                                      "Telefone",
                                    )
                                  }
                                  aria-label="Copiar telefone da indicadora"
                                >
                                  {copiedId === copyKeyIndPhone ? (
                                    <Check className="h-3 w-3 text-primary" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={indicacao.status_abordagem}
                          onValueChange={(value) => handleStatusChange(indicacao.id, value as StatusAbordagem)}
                        >
                          <SelectTrigger className="w-[150px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[100]">
                            {Object.entries(statusAbordagemLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const assignedId = indicacao.assigned_user_id || null;
                          const assigned = assignedId
                            ? profiles.find((p) => p.id === assignedId)
                            : null;
                          const assignedLabel =
                            assigned?.full_name || assigned?.email || (assignedId ? "Usuário" : "Não atribuído");
                          const isMine = assignedId === user?.id;
                          return (
                            <div className="flex items-center gap-1.5">
                              <Select
                                value={assignedId ?? UNASSIGNED_VALUE}
                                onValueChange={(value) =>
                                  handleAssignUser(indicacao.id, value === UNASSIGNED_VALUE ? null : value)
                                }
                              >
                                <SelectTrigger className="w-[150px] h-8 text-xs">
                                  <div className="flex items-center gap-1.5 truncate">
                                    {assigned ? (
                                      <Avatar className="h-5 w-5">
                                        <AvatarFallback className="text-[10px]">
                                          {getInitials(assigned.full_name, assigned.email)}
                                        </AvatarFallback>
                                      </Avatar>
                                    ) : (
                                      <UserX className="h-3.5 w-3.5 text-muted-foreground" />
                                    )}
                                    <span className="truncate">{assignedLabel}</span>
                                  </div>
                                </SelectTrigger>
                                <SelectContent className="z-[100]">
                                  <SelectItem value={UNASSIGNED_VALUE}>Não atribuído</SelectItem>
                                  {profiles.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.full_name || p.email || "Usuário"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {!isMine && user?.id && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 shrink-0"
                                        onClick={() => handleAssignUser(indicacao.id, user.id)}
                                        aria-label="Assumir"
                                      >
                                        <UserCheck className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Assumir esta indicação</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          );
                        })()}
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
                                <DropdownMenuItem onClick={() => window.open(`https://wa.me/${formattedPhone?.dial || phone}`, "_blank")}>
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
                            {indicacao.motivo_abordagem ? (
                              <DropdownMenuItem disabled>
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Motivo: {motivoAbordagemLabels[indicacao.motivo_abordagem as MotivoAbordagem]}
                              </DropdownMenuItem>
                            ) : null}
                            {(Object.entries(motivoAbordagemLabels) as [MotivoAbordagem, string][]).map(([value, label]) => (
                              <DropdownMenuItem
                                key={value}
                                onClick={() => handleMotivoChange(indicacao.id, value)}
                              >
                                <span className="ml-6 text-xs">Definir motivo: {label}</span>
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={convertingId === indicacao.id || indicacao.status_abordagem === "convertido"}
                              onSelect={(e) => {
                                e.preventDefault();
                                openConvertDialog(indicacao);
                              }}
                            >
                              {convertingId === indicacao.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <UserPlus className="h-4 w-4 mr-2" />
                              )}
                              {indicacao.status_abordagem === "convertido" ? "Já convertida" : "Converter em Processo"}
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
      )}

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

      <ConvertToProcessDialog
        indicacao={convertTarget}
        open={convertDialogOpen}
        onOpenChange={(open) => {
          setConvertDialogOpen(open);
          if (!open) setConvertTarget(null);
        }}
        onConfirm={handleConvertToProcess}
      />

    </div>
  );
}
