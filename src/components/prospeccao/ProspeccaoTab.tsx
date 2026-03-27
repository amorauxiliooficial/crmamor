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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProspeccaoDetailPanel } from "./ProspeccaoDetailPanel";
import { ProspeccaoFormDialog } from "./ProspeccaoFormDialog";
import { ImportProspeccaoDialog } from "./ImportProspeccaoDialog";
import { ProspeccaoMobileList } from "./ProspeccaoMobileList";
import { Plus, Search, Users, Clock, CheckCircle, Loader2, MessageSquare, Phone, Copy, Check, Upload, Target, Baby } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const [proximaFilter, setProximaFilter] = useState(false);

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

  useEffect(() => {
    if (user?.id) fetchData();
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
      result = result.filter((p) => p.mes_gestacao != null && p.mes_gestacao >= 7);
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
    return result;
  }, [items, searchQuery, localSearch, selectedUserId, statusFilter, proximaFilter]);

  const stats = useMemo(() => ({
    total: filtered.length,
    novos: filtered.filter((p) => p.status === "novo").length,
    emContato: filtered.filter((p) => p.status === "em_contato").length,
    qualificados: filtered.filter((p) => p.status === "qualificado").length,
    proximas: items.filter((p) => p.mes_gestacao != null && p.mes_gestacao >= 7).length,
  }), [filtered, items]);

  const handleRowClick = (p: Prospeccao) => {
    setSelected(p);
    setPanelOpen(true);
  };

  const handleCopyPhone = async (e: React.MouseEvent, phone: string, id: string) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
        <Card className={proximaFilter ? "ring-1 ring-primary" : ""} onClick={() => setProximaFilter(!proximaFilter)} role="button">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Baby className="h-4 w-4 text-pink-500" />7+ meses</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.proximas}</div></CardContent>
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
        <ProspeccaoMobileList items={filtered} selectedId={selected?.id} onSelect={handleRowClick} />
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
                <TableHead>Origem</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma prospecção encontrada</TableCell></TableRow>
              ) : (
                filtered.map((p) => {
                  const phone = sanitizePhone(p.telefone_e164 || p.telefone);
                  return (
                    <TableRow key={p.id} className={`cursor-pointer hover:bg-muted/50 ${selected?.id === p.id && panelOpen ? "bg-muted" : ""}`} onClick={() => handleRowClick(p)}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {p.telefone && (
                          <TooltipProvider>
                            <div className="flex items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm">
                                    <MessageSquare className="h-3 w-3" />{p.telefone}
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
                        {p.mes_gestacao ? (
                          <div className="flex items-center gap-1">
                            <span>{p.mes_gestacao}º mês</span>
                            {p.mes_gestacao >= 7 && (
                              <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-5 ${p.mes_gestacao >= 8 ? "bg-pink-200 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"}`}>
                                ⏳ {p.mes_gestacao >= 8 ? "Urgente" : "Próxima"}
                              </Badge>
                            )}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${statusProspeccaoColors[p.status]}`}>
                          {statusProspeccaoLabels[p.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{p.origem || "chatbot"}</TableCell>
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
