import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import { cn } from "@/lib/utils";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { IndicacaoDetailPanel } from "./IndicacaoDetailPanel";
import { IndicacaoFormDialog } from "./IndicacaoFormDialog";
import { IndicacaoMobileList } from "./IndicacaoMobileList";
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
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
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
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndicacao, setSelectedIndicacao] = useState<Indicacao | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [userProfile, setUserProfile] = useState<{ full_name: string | null } | null>(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusAbordagem | null>(null);
  const [origemFilter, setOrigemFilter] = useState<"all" | OrigemIndicacao>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<"all" | "7" | "30">("all");
  const [sortBy, setSortBy] = useState<"data" | "status">("data");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
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

  const displayedIndicacoes = useMemo(() => {
    let result = filteredIndicacoes;

    if (statusFilter) {
      result = result.filter((i) => i.status_abordagem === statusFilter);
    }

    if (origemFilter !== "all") {
      result = result.filter((i) => (i.origem_indicacao || "interna") === origemFilter);
    }

    if (dateRangeFilter !== "all") {
      const maxDays = dateRangeFilter === "7" ? 7 : 30;
      const now = new Date();
      result = result.filter((i) => {
        const d = differenceInDays(now, parseISO(i.data_indicacao));
        return d <= maxDays;
      });
    }

    const statusOrder: Record<string, number> = {
      aguardando_aprovacao: 0,
      pendente: 1,
      em_andamento: 2,
      concluido: 3,
    };

    const sorted = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "data") {
        cmp = parseISO(a.data_indicacao).getTime() - parseISO(b.data_indicacao).getTime();
      } else {
        cmp = (statusOrder[a.status_abordagem] ?? 99) - (statusOrder[b.status_abordagem] ?? 99);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [filteredIndicacoes, statusFilter, origemFilter, dateRangeFilter, sortBy, sortDir]);

  const duplicatePhones = useMemo(() => {
    const counts = new Map<string, number>();
    displayedIndicacoes.forEach((ind) => {
      const p = ind.telefone_indicada?.replace(/\D/g, "") || "";
      if (p) counts.set(p, (counts.get(p) || 0) + 1);
    });
    return new Set(
      Array.from(counts.entries())
        .filter(([, c]) => c > 1)
        .map(([p]) => p)
    );
  }, [displayedIndicacoes]);

  const isSelfReferral = (ind: Indicacao) => {
    const a = ind.nome_indicada?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const b = ind.nome_indicadora?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    return a && b && a === b;
  };

  const proximoPasso = (status: StatusAbordagem) => {
    switch (status) {
      case "aguardando_aprovacao":
        return "Entrar em contato";
      case "pendente":
        return "Retomar contato";
      case "em_andamento":
        return "Acompanhar";
      case "concluido":
        return "-";
      default:
        return "-";
    }
  };

  const toggleSort = (col: "data" | "status") => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir(col === "data" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ col }: { col: "data" | "status" }) => {
    if (sortBy !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

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
    const prev = indicacoes;
    // Optimistic in-place update to avoid a full refetch + re-render of all rows
    setIndicacoes((curr) => curr.map((i) => (i.id === indicacaoId ? { ...i, status_abordagem: status } : i)));

    const { error } = await supabase.from("indicacoes").update({ status_abordagem: status }).eq("id", indicacaoId);

    if (error) {
      setIndicacoes(prev);
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
    }
  };

  const handleMotivoChange = async (indicacaoId: string, motivo: MotivoAbordagem) => {
    const userName = userProfile?.full_name || user?.email || "Usuário";
    const prev = indicacoes;
    setIndicacoes((curr) => curr.map((i) => (i.id === indicacaoId ? { ...i, motivo_abordagem: motivo } : i)));

    const { error } = await supabase.from("indicacoes").update({ motivo_abordagem: motivo }).eq("id", indicacaoId);

    if (error) {
      setIndicacoes(prev);
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

  const TableSkeleton = () => (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={`skel-${i}`}>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-8" /></TableCell>
        </TableRow>
      ))}
    </>
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card
          onClick={() => setStatusFilter(null)}
          className="cursor-pointer transition-all hover:shadow-md"
        >
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
        <Card
          onClick={() => setStatusFilter((prev) => (prev === "aguardando_aprovacao" ? null : "aguardando_aprovacao"))}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            statusFilter === "aguardando_aprovacao" && "ring-2 ring-primary shadow-md"
          )}
        >
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
        <Card
          onClick={() => setStatusFilter((prev) => (prev === "pendente" ? null : "pendente"))}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            statusFilter === "pendente" && "ring-2 ring-primary shadow-md"
          )}
        >
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
        <Card
          onClick={() => setStatusFilter((prev) => (prev === "em_andamento" ? null : "em_andamento"))}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            statusFilter === "em_andamento" && "ring-2 ring-primary shadow-md"
          )}
        >
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
        <Card
          onClick={() => setStatusFilter((prev) => (prev === "concluido" ? null : "concluido"))}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            statusFilter === "concluido" && "ring-2 ring-primary shadow-md"
          )}
        >
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

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={statusFilter ?? "all"}
          onValueChange={(v) => setStatusFilter(v === "all" ? null : (v as StatusAbordagem))}
        >
          <SelectTrigger className="w-full sm:w-[170px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(statusAbordagemLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={origemFilter} onValueChange={(v) => setOrigemFilter(v as "all" | OrigemIndicacao)}>
          <SelectTrigger className="w-full sm:w-[150px] h-9">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as origens</SelectItem>
            <SelectItem value="externa">Externa</SelectItem>
            <SelectItem value="interna">Interna</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateRangeFilter} onValueChange={(v) => setDateRangeFilter(v as "all" | "7" | "30")}>
          <SelectTrigger className="w-full sm:w-[170px] h-9">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tudo</SelectItem>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
          </SelectContent>
        </Select>

        {(statusFilter || origemFilter !== "all" || dateRangeFilter !== "all") && (
          <Badge
            variant="secondary"
            className="cursor-pointer hover:bg-muted text-xs gap-1"
            onClick={() => {
              setStatusFilter(null);
              setOrigemFilter("all");
              setDateRangeFilter("all");
            }}
          >
            <X className="h-3 w-3" />
            Limpar filtros
          </Badge>
        )}
      </div>


      {/* Content: Mobile cards vs Desktop table */}
      {isMobile ? (
        <IndicacaoMobileList
          indicacoes={displayedIndicacoes}
          selectedId={selectedIndicacao?.id}
          onSelect={handleRowClick}
          loading={loading}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => toggleSort("data")}
                    className="inline-flex items-center font-medium hover:text-foreground"
                  >
                    Data
                    <SortIcon col="data" />
                  </button>
                </TableHead>
                <TableHead>Indicada</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Indicadora</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => toggleSort("status")}
                    className="inline-flex items-center font-medium hover:text-foreground"
                  >
                    Status
                    <SortIcon col="status" />
                  </button>
                </TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Próximo passo</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton />
              ) : displayedIndicacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhuma indicação encontrada — ajuste os filtros
                  </TableCell>
                </TableRow>
              ) : (
                displayedIndicacoes.map((indicacao) => {
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
                          {(indicacao.status_abordagem === "pendente" || indicacao.status_abordagem === "aguardando_aprovacao") && (() => {
                            const dias = differenceInDays(new Date(), parseISO(indicacao.data_indicacao));
                            const cor = dias > 14 ? "text-red-600 dark:text-red-400" : dias > 7 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground";
                            return (
                              <span className={cn("text-xs flex items-center gap-1", cor)}>
                                {dias > 14 && <AlertCircle className="h-3 w-3" />}
                                há {dias} {dias === 1 ? "dia" : "dias"}
                              </span>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{indicacao.nome_indicada}</span>
                          {isSelfReferral(indicacao) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700 text-[10px] px-1 py-0 h-5 cursor-help shrink-0">
                                  Auto
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>Possível auto-indicação</TooltipContent>
                            </Tooltip>
                          )}
                          {duplicatePhones.has(phone) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700 text-[10px] px-1 py-0 h-5 cursor-help shrink-0">
                                  Dup
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>Telefone duplicado</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${origemIndicacaoColors[origem]}`}>
                          {origem === "externa" && <ExternalLink className="h-3 w-3 mr-1" />}
                          {origemIndicacaoLabels[origem]}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {indicacao.telefone_indicada && (
                          <TooltipProvider>
                            <div className="flex items-center gap-1 whitespace-nowrap">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={`https://wa.me/${phone}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm"
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
                                    aria-label="Copiar telefone"
                                    onClick={() => handleCopyPhone(indicacao.telefone_indicada!, indicacao.id)}
                                  >
                                    {copiedPhoneId === indicacao.id ? (
                                      <Check className="h-3 w-3 text-primary" />
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
                          <SelectTrigger className="w-[200px] h-8 text-xs">
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
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {proximoPasso(indicacao.status_abordagem)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais ações">
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
    </div>
  );
}
