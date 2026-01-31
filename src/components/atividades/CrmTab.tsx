import { useState, useMemo, useEffect } from "react";
import { MaeProcesso } from "@/types/mae";
import { TipoAtividade, TIPO_ATIVIDADE_LABELS, RESULTADO_CONTATO_LABELS, ResultadoContato } from "@/types/atividade";
import { useCrmAtividades, PendingFollowUp, useFollowUpCounts, useFollowUpsByDate } from "@/hooks/useCrmAtividades";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { RegistrarAtividadeDialog } from "./RegistrarAtividadeDialog";
import { ClienteCard } from "./ClienteCard";
import { AgendarFollowUpDialog } from "./AgendarFollowUpDialog";
import { HistoricoAtividadesDialog } from "./HistoricoAtividadesDialog";
import { MetasDashboard } from "@/components/metas/MetasDashboard";
import { MetasConfigDialog } from "@/components/metas/MetasConfigDialog";
import { formatCpf } from "@/lib/formatters";
import { 
  Phone, 
  MessageCircle, 
  FileText, 
  StickyNote,
  Video,
  Search,
  AlertCircle,
  Clock,
  CheckCircle2,
  CalendarDays,
  ListTodo,
  Loader2,
  Play,
  X,
  MoreHorizontal,
  Users,
  Target
} from "lucide-react";
import { format, isToday, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CrmTabProps {
  maes: MaeProcesso[];
  onRefresh: () => void;
  selectedUserId?: string | null;
}

const TIPO_ICONS: Record<TipoAtividade, typeof Phone> = {
  ligacao: Phone,
  whatsapp: MessageCircle,
  documento: FileText,
  anotacao: StickyNote,
  reuniao: Video,
};

const TIPO_BG_COLORS: Record<TipoAtividade, string> = {
  ligacao: "bg-blue-100 dark:bg-blue-900/30",
  whatsapp: "bg-emerald-100 dark:bg-emerald-900/30",
  documento: "bg-purple-100 dark:bg-purple-900/30",
  anotacao: "bg-amber-100 dark:bg-amber-900/30",
  reuniao: "bg-rose-100 dark:bg-rose-900/30",
};

interface ClienteWithActivity extends MaeProcesso {
  pendingCount: number;
  lastActivityDate: string | null;
}

export function CrmTab({ maes, onRefresh, selectedUserId }: CrmTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { categorized, loading, refetch, completeFollowUp, cancelFollowUp } = useCrmAtividades();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMae, setSelectedMae] = useState<MaeProcesso | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("metas");
  
  // Dialog states
  const [agendarDialogOpen, setAgendarDialogOpen] = useState(false);
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false);
  const [metasConfigOpen, setMetasConfigOpen] = useState(false);
  
  // User ID for metas (selected user or current user)
  const metasUserId = selectedUserId || user?.id || null;
  
  // Calendar data
  const { counts: followUpCounts } = useFollowUpCounts(selectedDate.getFullYear(), selectedDate.getMonth());
  const { followUps: dateFollowUps, loading: dateLoading } = useFollowUpsByDate(selectedDate);
  
  // Clients with pending count
  const [clientesComPendencias, setClientesComPendencias] = useState<ClienteWithActivity[]>([]);
  const [clientesLoading, setClientesLoading] = useState(false);

  // Fetch pending counts for all clients
  useEffect(() => {
    const fetchClientesPendencias = async () => {
      if (maes.length === 0) return;
      
      setClientesLoading(true);
      
      // Get pending counts and last activity for each mae
      const maeIds = maes.map(m => m.id);
      
      const { data: atividades } = await supabase
        .from("atividades_mae")
        .select("mae_id, data_atividade, status_followup, concluido")
        .in("mae_id", maeIds);
      
      const clientesEnriquecidos = maes.map(mae => {
        const maeAtividades = atividades?.filter(a => a.mae_id === mae.id) || [];
        const pendentes = maeAtividades.filter(a => 
          a.status_followup === "agendado" && !a.concluido
        ).length;
        const ultimaAtividade = maeAtividades
          .sort((a, b) => new Date(b.data_atividade).getTime() - new Date(a.data_atividade).getTime())[0];
        
        return {
          ...mae,
          pendingCount: pendentes,
          lastActivityDate: ultimaAtividade?.data_atividade || null,
        };
      });
      
      // Sort: pending first, then by last activity
      clientesEnriquecidos.sort((a, b) => {
        if (a.pendingCount !== b.pendingCount) return b.pendingCount - a.pendingCount;
        if (!a.lastActivityDate) return 1;
        if (!b.lastActivityDate) return -1;
        return new Date(b.lastActivityDate).getTime() - new Date(a.lastActivityDate).getTime();
      });
      
      setClientesComPendencias(clientesEnriquecidos);
      setClientesLoading(false);
    };
    
    fetchClientesPendencias();
  }, [maes]);

  // Filter follow-ups by search
  const filterBySearch = (items: PendingFollowUp[]) => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      (f) => f.mae_nome.toLowerCase().includes(query) || f.mae_cpf.includes(query.replace(/\D/g, ""))
    );
  };
  
  // Filter clients by search
  const filteredClientes = useMemo(() => {
    if (!searchQuery.trim()) return clientesComPendencias;
    const query = searchQuery.toLowerCase();
    return clientesComPendencias.filter(
      (c) => c.nome_mae.toLowerCase().includes(query) || c.cpf.includes(query.replace(/\D/g, ""))
    );
  }, [clientesComPendencias, searchQuery]);

  const handleStartFollowUp = (followUp: PendingFollowUp) => {
    const mae = maes.find((m) => m.id === followUp.mae_id);
    if (mae) {
      setSelectedMae(mae);
      setDialogOpen(true);
    }
  };

  const handleComplete = async (followUpId: string) => {
    setActionLoading(followUpId);
    const { error } = await completeFollowUp(followUpId);
    setActionLoading(null);
    
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível completar." });
    } else {
      toast({ title: "✓ Concluído", description: "Follow-up marcado como concluído." });
      onRefresh();
    }
  };

  const handleCancel = async (followUpId: string) => {
    setActionLoading(followUpId);
    const { error } = await cancelFollowUp(followUpId);
    setActionLoading(null);
    
    if (error) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível cancelar." });
    } else {
      toast({ title: "Cancelado", description: "Follow-up cancelado." });
      onRefresh();
    }
  };
  
  // Cliente actions
  const handleNovaAtividade = (mae: MaeProcesso) => {
    setSelectedMae(mae);
    setDialogOpen(true);
  };
  
  const handleVerHistorico = (mae: MaeProcesso) => {
    setSelectedMae(mae);
    setHistoricoDialogOpen(true);
  };
  
  const handleAgendarFollowUp = (mae: MaeProcesso) => {
    setSelectedMae(mae);
    setAgendarDialogOpen(true);
  };

  const FollowUpCard = ({ followUp, showDate = true }: { followUp: PendingFollowUp; showDate?: boolean }) => {
    const Icon = followUp.proxima_acao ? TIPO_ICONS[followUp.proxima_acao as TipoAtividade] : Clock;
    const bgColor = followUp.proxima_acao ? TIPO_BG_COLORS[followUp.proxima_acao as TipoAtividade] : "bg-muted";
    const isOverdue = followUp.data_proxima_acao && isPast(parseISO(followUp.data_proxima_acao)) && !isToday(parseISO(followUp.data_proxima_acao));
    const isLoading = actionLoading === followUp.id;

    return (
      <Card className={`transition-all hover:shadow-md ${isOverdue ? "border-l-4 border-l-destructive" : ""}`}>
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${bgColor}`}>
              <Icon className="h-4 w-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm truncate">{followUp.mae_nome}</h4>
                {isOverdue && <Badge variant="destructive" className="text-[10px]">Atrasado</Badge>}
              </div>
              
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{formatCpf(followUp.mae_cpf)}</span>
                {showDate && followUp.data_proxima_acao && (
                  <>
                    <span>•</span>
                    <span className={isOverdue ? "text-destructive font-medium" : ""}>
                      {format(parseISO(followUp.data_proxima_acao), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </>
                )}
                {followUp.resultado_contato && (
                  <>
                    <span>•</span>
                    <span>{RESULTADO_CONTATO_LABELS[followUp.resultado_contato as ResultadoContato]}</span>
                  </>
                )}
              </div>
              
              {followUp.descricao && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">
                  {followUp.descricao}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="sm"
                onClick={() => handleStartFollowUp(followUp)}
                disabled={isLoading}
                className="h-8 gap-1"
              >
                <Play className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Iniciar</span>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleComplete(followUp.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Marcar como concluído
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCancel(followUp.id)} className="text-destructive">
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats Header */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">{categorized.overdue.length}</p>
                <p className="text-xs text-muted-foreground">Atrasados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-amber-600">{categorized.today.length}</p>
                <p className="text-xs text-muted-foreground">Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{categorized.upcoming.length}</p>
                <p className="text-xs text-muted-foreground">Próximos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold text-emerald-600">{maes.length}</p>
                <p className="text-xs text-muted-foreground">Clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou CPF..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs: Metas / Follow-ups / Clients / Calendar */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="metas" className="gap-2">
            <Target className="h-4 w-4" />
            Metas
          </TabsTrigger>
          <TabsTrigger value="followups" className="gap-2">
            <ListTodo className="h-4 w-4" />
            Follow-ups
          </TabsTrigger>
          <TabsTrigger value="clientes" className="gap-2">
            <Users className="h-4 w-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Calendário
          </TabsTrigger>
        </TabsList>

        {/* Metas View */}
        <TabsContent value="metas" className="mt-4">
          <ScrollArea className="h-[calc(100vh-460px)] min-h-[350px]">
            <MetasDashboard 
              userId={metasUserId}
              isAdmin={isAdmin}
              onConfigClick={() => setMetasConfigOpen(true)}
            />
          </ScrollArea>
        </TabsContent>

        {/* Follow-ups View */}
        <TabsContent value="followups" className="mt-4">
          <ScrollArea className="h-[calc(100vh-460px)] min-h-[350px]">
            <div className="space-y-4 pr-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Overdue Section */}
                  {categorized.overdue.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Atrasados ({categorized.overdue.length})
                      </h3>
                      {filterBySearch(categorized.overdue).map((f) => (
                        <FollowUpCard key={f.id} followUp={f} />
                      ))}
                    </div>
                  )}

                  {/* Today Section */}
                  {categorized.today.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-amber-600 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Hoje ({categorized.today.length})
                      </h3>
                      {filterBySearch(categorized.today).map((f) => (
                        <FollowUpCard key={f.id} followUp={f} />
                      ))}
                    </div>
                  )}

                  {/* Upcoming Section */}
                  {categorized.upcoming.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-primary flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Próximos ({categorized.upcoming.length})
                      </h3>
                      {filterBySearch(categorized.upcoming).map((f) => (
                        <FollowUpCard key={f.id} followUp={f} />
                      ))}
                    </div>
                  )}

                  {/* Empty State */}
                  {categorized.overdue.length === 0 && 
                   categorized.today.length === 0 && 
                   categorized.upcoming.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Nenhum follow-up agendado</p>
                      <p className="text-xs mt-1">Vá em "Clientes" para agendar atividades</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Clients View */}
        <TabsContent value="clientes" className="mt-4">
          <ScrollArea className="h-[calc(100vh-460px)] min-h-[350px]">
            <div className="space-y-2 pr-4">
              {clientesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredClientes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum cliente encontrado</p>
                </div>
              ) : (
                filteredClientes.map((cliente) => (
                  <ClienteCard
                    key={cliente.id}
                    mae={cliente}
                    pendingCount={cliente.pendingCount}
                    lastActivityDate={cliente.lastActivityDate}
                    onNovaAtividade={handleNovaAtividade}
                    onVerHistorico={handleVerHistorico}
                    onAgendarFollowUp={handleAgendarFollowUp}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Calendar View */}
        <TabsContent value="calendar" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Calendar */}
            <Card>
              <CardContent className="p-3">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={ptBR}
                  className="w-full"
                  modifiers={{
                    hasFollowUp: (date) => {
                      const dateKey = format(date, "yyyy-MM-dd");
                      return (followUpCounts[dateKey] || 0) > 0;
                    },
                  }}
                  modifiersStyles={{
                    hasFollowUp: {
                      backgroundColor: "hsl(var(--primary) / 0.1)",
                      fontWeight: "bold",
                    },
                  }}
                />
              </CardContent>
            </Card>

            {/* Selected Date Follow-ups */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[280px]">
                  {dateLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  ) : dateFollowUps.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Nenhum follow-up para esta data
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dateFollowUps.map((f) => (
                        <FollowUpCard key={f.id} followUp={f} showDate={false} />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Register Activity Dialog */}
      {selectedMae && (
        <RegistrarAtividadeDialog
          mae={selectedMae}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onActivityAdded={() => {
            refetch();
            onRefresh();
          }}
        />
      )}
      
      {/* Agendar Follow-up Dialog */}
      {selectedMae && (
        <AgendarFollowUpDialog
          mae={selectedMae}
          open={agendarDialogOpen}
          onOpenChange={setAgendarDialogOpen}
          onFollowUpAgendado={() => {
            refetch();
            onRefresh();
          }}
        />
      )}
      
      {/* Histórico Dialog */}
      {selectedMae && (
        <HistoricoAtividadesDialog
          mae={selectedMae}
          open={historicoDialogOpen}
          onOpenChange={setHistoricoDialogOpen}
        />
      )}
      
      {/* Metas Config Dialog (Admin only) */}
      <MetasConfigDialog
        open={metasConfigOpen}
        onOpenChange={setMetasConfigOpen}
      />
    </div>
  );
}