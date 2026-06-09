import { useState, useEffect, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import { Prospeccao, StatusProspeccao, statusProspeccaoLabels, statusProspeccaoColors } from "@/types/prospeccao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProspeccaoDetailPanel } from "./ProspeccaoDetailPanel";
import { ProspeccaoFormDialog } from "./ProspeccaoFormDialog";
import { ImportProspeccaoDialog } from "./ImportProspeccaoDialog";
import { ProspeccaoMobileList } from "./ProspeccaoMobileList";
import { Plus, Search, Users, Clock, CheckCircle, Loader2, MessageSquare, Phone, Copy, Check, Upload, Target, Baby, UserX, UserCheck, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { calcularMesGestacaoProspeccao } from "@/lib/gestacaoUtils";
import { formatTimeSince, getLeadHeat, leadHeatClasses, leadHeatLabels } from "@/lib/leadTimeUtils";

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

interface ProspeccaoTabProps {
  searchQuery?: string;
  selectedUserId?: string;
}

export function ProspeccaoTab({ searchQuery = "", selectedUserId }: ProspeccaoTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [items, setItems] = useState<Prospeccao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Prospeccao | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedNameId, setCopiedNameId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [proximaFilter, setProximaFilter] = useState(false);
  const [semDonoFilter, setSemDonoFilter] = useState(false);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);

  // Tick every 60s so heat badge refreshes
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase.from("prospeccao" as any).select("*").order("created_at", { ascending: false });
    if (error) {
      logError("fetch_prospeccao", error);
      toast({ variant: "destructive", title: "Erro ao carregar", description: getUserFriendlyError(error) });
    } else {
      setItems((data || []) as unknown as Prospeccao[]);
    }
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name", { ascending: true });
    if (!error && data) setProfiles(data as ProfileOption[]);
  };

  useEffect(() => {
    if (user?.id) {
      fetchData();
      fetchProfiles();
    }
  }, [user?.id]);

  const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filtered = useMemo(() => {
    let result = items;
    if (selectedUserId && selectedUserId !== "all") {
      result = result.filter((p) => p.user_id === selectedUserId);
    }
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (proximaFilter) {
      result = result.filter((p) => {
        const m = calcularMesGestacaoProspeccao(p.mes_gestacao, p.created_at);
        return m != null && m >= 7;
      });
    }
    if (semDonoFilter) {
      result = result.filter(
        (p) => !p.assigned_user_id && p.status !== "convertido" && p.status !== "sem_interesse",
      );
    }
    const q = removeAccents((searchQuery || localSearch).toLowerCase().trim());
    if (q) {
      result = result.filter((p) => {
        const name = removeAccents(p.nome.toLowerCase());
        const phone = p.telefone?.replace(/\D/g, "") || "";
        const qDigits = q.replace(/\D/g, "");
        return name.includes(q) || (qDigits.length > 0 && phone.includes(qDigits));
      });
    }
    // Ordering: sem dono primeiro, depois mais quente -> mais frio para priorizar
    const heatOrder: Record<string, number> = { fresh: 1, warm: 2, cooling: 3, cold: 4 };
    return [...result].sort((a, b) => {
      const aHas = a.assigned_user_id ? 1 : 0;
      const bHas = b.assigned_user_id ? 1 : 0;
      if (aHas !== bHas) return aHas - bHas; // sem dono (0) primeiro
      const ah = getLeadHeat(a.assigned_at) || "fresh";
      const bh = getLeadHeat(b.assigned_at) || "fresh";
      return heatOrder[ah] - heatOrder[bh];
    });
  }, [items, searchQuery, localSearch, selectedUserId, statusFilter, proximaFilter, semDonoFilter]);

  const isActiveProspeccao = (s: StatusProspeccao) => s !== "convertido" && s !== "sem_interesse";

  const stats = useMemo(() => ({
    total: filtered.length,
    novos: filtered.filter((p) => p.status === "novo").length,
    emContato: filtered.filter((p) => p.status === "em_contato").length,
    qualificados: filtered.filter((p) => p.status === "qualificado").length,
    proximas: items.filter((p) => {
      const m = calcularMesGestacaoProspeccao(p.mes_gestacao, p.created_at);
      return m != null && m >= 7;
    }).length,
    semDono: items.filter((p) => !p.assigned_user_id && isActiveProspeccao(p.status)).length,
    esfriando: items.filter((p) => {
      if (!p.assigned_user_id || !isActiveProspeccao(p.status)) return false;
      const h = getLeadHeat(p.assigned_at);
      return h === "cooling" || h === "cold";
    }).length,
  }), [filtered, items]);

  const handleRowClick = (p: Prospeccao) => {
    setSelected(p);
    setPanelOpen(true);
  };

  const handleCopyPhone = async (e: React.MouseEvent, phone: string, id: string) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(`+55 ${phone}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyName = async (e: React.MouseEvent, name: string, id: string) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(name);
    setCopiedNameId(id);
    setTimeout(() => setCopiedNameId(null), 2000);
  };

  const handleStatusChange = async (id: string, newStatus: StatusProspeccao) => {
    setUpdatingStatusId(id);
    const prev = items;
    setItems((curr) => curr.map((it) => (it.id === id ? { ...it, status: newStatus } : it)));
    const { error } = await supabase.from("prospeccao" as any).update({ status: newStatus }).eq("id", id);
    if (error) {
      setItems(prev);
      logError("update_prospeccao_status", error);
      toast({ variant: "destructive", title: "Erro ao atualizar status", description: getUserFriendlyError(error) });
    } else {
      toast({ title: "Status atualizado", description: statusProspeccaoLabels[newStatus] });
    }
    setUpdatingStatusId(null);
  };

  const handleAssignUser = async (id: string, newUserId: string | null) => {
    const prev = items;
    const nowIso = new Date().toISOString();
    const newAssignedAt = newUserId ? nowIso : null;
    setItems((curr) =>
      curr.map((it) =>
        it.id === id ? { ...it, assigned_user_id: newUserId, assigned_at: newAssignedAt } : it,
      ),
    );
    const { error } = await supabase
      .from("prospeccao" as any)
      .update({ assigned_user_id: newUserId, assigned_at: newAssignedAt })
      .eq("id", id);
    if (error) {
      setItems(prev);
      logError("assign_prospeccao", error);
      toast({ variant: "destructive", title: "Erro ao atribuir", description: getUserFriendlyError(error) });
      return;
    }
    toast({
      title: newUserId === user?.id ? "Você assumiu a prospecção" : newUserId ? "Responsável atualizado" : "Responsável removido",
    });
  };

  const sanitizePhone = (phone: string | undefined | null): string => {
    if (!phone) return "";
    return phone.replace(/\D/g, "");
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Total</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Target className="h-4 w-4 text-muted-foreground" />Novos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.novos}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />Em Contato</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.emContato}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><CheckCircle className="h-4 w-4 text-muted-foreground" />Qualificados</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.qualificados}</div></CardContent>
        </Card>
        <Card className={proximaFilter ? "ring-1 ring-primary cursor-pointer" : "cursor-pointer"} onClick={() => setProximaFilter(!proximaFilter)} role="button">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Baby className="h-4 w-4 text-pink-500" />7+ meses</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.proximas}</div></CardContent>
        </Card>
        <Card
          role="button"
          onClick={() => setSemDonoFilter(!semDonoFilter)}
          className={`cursor-pointer transition ${semDonoFilter ? "ring-2 ring-primary" : ""} ${stats.semDono > 0 ? "border-primary/50" : ""}`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserX className={`h-4 w-4 ${stats.semDono > 0 ? "text-primary" : "text-muted-foreground"}`} />
              Sem dono
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.semDono > 0 ? "text-primary" : ""}`}>{stats.semDono}</div>
            <p className="text-[10px] text-muted-foreground">Clique para priorizar</p>
          </CardContent>
        </Card>
        <Card className={stats.esfriando > 0 ? "border-destructive/40" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${stats.esfriando > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              Esfriando
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.esfriando > 0 ? "text-destructive" : ""}`}>{stats.esfriando}</div>
            <p className="text-[10px] text-muted-foreground">+ 1 dia útil parado</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou telefone..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(statusProspeccaoLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Lote
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Prospecção
          </Button>
        </div>
      </div>

      {/* Content */}
      {isMobile ? (
        <ProspeccaoMobileList
          items={filtered}
          selectedId={selected?.id}
          onSelect={handleRowClick}
          onStatusChange={handleStatusChange}
          updatingStatusId={updatingStatusId}
          profiles={profiles}
          currentUserId={user?.id}
          onAssign={handleAssignUser}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead>Mês</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[220px]">Responsável</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma prospecção encontrada</TableCell></TableRow>
              ) : (
                filtered.map((p) => {
                  const phone = sanitizePhone(p.telefone_e164 || p.telefone);
                  const assigned = p.assigned_user_id ? profiles.find((pr) => pr.id === p.assigned_user_id) : null;
                  const assignedLabel = assigned?.full_name || assigned?.email || (p.assigned_user_id ? "Usuário" : "Sem dono");
                  const isMine = p.assigned_user_id === user?.id;
                  const heat = p.assigned_user_id ? getLeadHeat(p.assigned_at) : null;
                  const timeWith = p.assigned_user_id ? formatTimeSince(p.assigned_at) : null;
                  const isUnassigned = !p.assigned_user_id && isActiveProspeccao(p.status);
                  return (
                    <TableRow key={p.id} className={`cursor-pointer hover:bg-muted/50 ${selected?.id === p.id && panelOpen ? "bg-muted" : ""} ${isUnassigned ? "bg-primary/5" : ""}`} onClick={() => handleRowClick(p)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1 group">
                          <span>{p.nome}</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => handleCopyName(e, p.nome, p.id)}
                                >
                                  {copiedNameId === p.id ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copiar nome</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {p.telefone && (
                          <TooltipProvider>
                            <div className="flex items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm">
                                    <MessageSquare className="h-3 w-3" />+55 {p.telefone}
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>Abrir WhatsApp</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => handleCopyPhone(e, p.telefone, p.id)}>
                                    {copiedId === p.id ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copiar telefone</TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {p.observacoes ? (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground line-clamp-2 cursor-help block leading-relaxed">
                                  {p.observacoes}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-[350px] text-xs whitespace-pre-wrap p-3">
                                {p.observacoes}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const mesAtual = calcularMesGestacaoProspeccao(p.mes_gestacao, p.created_at);
                          if (!mesAtual) return "-";
                          return (
                            <div className="flex items-center gap-1">
                              <span>{mesAtual}º mês</span>
                              {mesAtual >= 7 && (
                                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-5 ${mesAtual >= 8 ? "bg-pink-200 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"}`}>
                                  ⏳ {mesAtual >= 8 ? "Urgente" : "Próxima"}
                                </Badge>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={p.status}
                          onValueChange={(v) => handleStatusChange(p.id, v as StatusProspeccao)}
                          disabled={updatingStatusId === p.id}
                        >
                          <SelectTrigger className={`h-7 w-[140px] text-xs border-0 ${statusProspeccaoColors[p.status]}`}>
                            <SelectValue>{statusProspeccaoLabels[p.status]}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusProspeccaoLabels).map(([v, l]) => (
                              <SelectItem key={v} value={v}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <Select
                              value={p.assigned_user_id ?? UNASSIGNED_VALUE}
                              onValueChange={(v) => handleAssignUser(p.id, v === UNASSIGNED_VALUE ? null : v)}
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
                                    <UserX className="h-3.5 w-3.5 text-primary" />
                                  )}
                                  <span className="truncate">{assignedLabel}</span>
                                </div>
                              </SelectTrigger>
                              <SelectContent className="z-[100]">
                                <SelectItem value={UNASSIGNED_VALUE}>Sem dono</SelectItem>
                                {profiles.map((pr) => (
                                  <SelectItem key={pr.id} value={pr.id}>
                                    {pr.full_name || pr.email || "Usuário"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {!isMine && user?.id && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant={isUnassigned ? "default" : "outline"}
                                      size="icon"
                                      className="h-8 w-8 shrink-0"
                                      onClick={() => handleAssignUser(p.id, user.id)}
                                      aria-label="Assumir"
                                    >
                                      <UserCheck className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Assumir esta prospecção</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          {heat && timeWith ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className={`h-5 px-1.5 text-[10px] font-medium border w-fit gap-1 ${leadHeatClasses[heat]}`}>
                                    <Clock className="h-2.5 w-2.5" />
                                    {timeWith} · {leadHeatLabels[heat]}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Atribuído há {timeWith}
                                  {p.assigned_at && ` • ${format(parseISO(p.assigned_at), "dd/MM/yy HH:mm", { locale: ptBR })}`}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : isUnassigned ? (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium border w-fit gap-1 bg-primary/15 text-primary border-primary/40">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              Prioridade — assumir
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{format(parseISO(p.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      <ProspeccaoDetailPanel prospeccao={selected} open={panelOpen} onOpenChange={setPanelOpen} onSuccess={() => { fetchData(); }} />
      <ProspeccaoFormDialog open={formOpen} onOpenChange={setFormOpen} onSuccess={fetchData} />
      <ImportProspeccaoDialog open={importOpen} onOpenChange={setImportOpen} onSuccess={fetchData} />
    </div>
  );
}
