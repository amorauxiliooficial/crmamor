import { useState, useMemo } from "react";
import { MaeProcesso } from "@/types/mae";
import { TipoAtividade, TIPO_ATIVIDADE_LABELS } from "@/types/atividade";
import { useFollowUpStatus, useAtividades } from "@/hooks/useAtividades";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FollowUpBadge } from "./FollowUpBadge";
import { AtividadeDialog } from "./AtividadeDialog";
import { formatCpf } from "@/lib/formatters";
import { 
  Phone, 
  MessageCircle, 
  FileText, 
  StickyNote,
  Search,
  AlertCircle,
  Clock,
  CheckCircle,
  Users,
  Loader2
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MaeComAtividade extends MaeProcesso {
  ultima_atividade_em?: string | null;
}

interface AtividadesTabProps {
  maes: MaeComAtividade[];
  onRefresh: () => void;
  selectedUserId?: string;
}

const TIPO_ICONS: Record<TipoAtividade, typeof Phone> = {
  ligacao: Phone,
  whatsapp: MessageCircle,
  documento: FileText,
  anotacao: StickyNote,
};

const TIPO_COLORS: Record<TipoAtividade, string> = {
  ligacao: "bg-blue-500 hover:bg-blue-600 text-white",
  whatsapp: "bg-emerald-500 hover:bg-emerald-600 text-white",
  documento: "bg-purple-500 hover:bg-purple-600 text-white",
  anotacao: "bg-amber-500 hover:bg-amber-600 text-white",
};

export function AtividadesTab({ maes, onRefresh, selectedUserId }: AtividadesTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { getFollowUpStatus, getDaysSinceLastActivity, configLoading } = useFollowUpStatus();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMae, setSelectedMae] = useState<MaeComAtividade | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [savingActivity, setSavingActivity] = useState<string | null>(null);

  // Filter only active processes
  const activeMaes = useMemo(() => {
    return maes.filter((mae) => {
      const status = mae.status_processo.toLowerCase();
      return !status.includes("aprovada") && 
             !status.includes("indeferida") && 
             !status.includes("encerrado");
    });
  }, [maes]);

  // Sort by urgency
  const sortedMaes = useMemo(() => {
    if (configLoading) return activeMaes;

    return [...activeMaes].sort((a, b) => {
      const statusA = getFollowUpStatus(a.ultima_atividade_em, a.status_processo, a.data_ultima_atualizacao);
      const statusB = getFollowUpStatus(b.ultima_atividade_em, b.status_processo, b.data_ultima_atualizacao);
      
      const priority = { overdue: 0, warning: 1, "no-activity": 2, ok: 3 };
      const priorityDiff = priority[statusA] - priority[statusB];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // Secondary sort by days since activity (descending)
      const daysA = getDaysSinceLastActivity(a.ultima_atividade_em, a.data_ultima_atualizacao);
      const daysB = getDaysSinceLastActivity(b.ultima_atividade_em, b.data_ultima_atualizacao);
      return daysB - daysA;
    });
  }, [activeMaes, getFollowUpStatus, getDaysSinceLastActivity, configLoading]);

  // Filter by search
  const filteredMaes = useMemo(() => {
    if (!searchQuery.trim()) return sortedMaes;
    
    const query = searchQuery.toLowerCase().trim();
    return sortedMaes.filter((mae) => 
      mae.nome_mae.toLowerCase().includes(query) ||
      mae.cpf.includes(query.replace(/\D/g, ""))
    );
  }, [sortedMaes, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    let overdue = 0;
    let warning = 0;
    let ok = 0;

    activeMaes.forEach((mae) => {
      const status = getFollowUpStatus(mae.ultima_atividade_em, mae.status_processo, mae.data_ultima_atualizacao);
      if (status === "overdue") overdue++;
      else if (status === "warning") warning++;
      else if (status === "ok") ok++;
    });

    return { overdue, warning, ok, total: activeMaes.length };
  }, [activeMaes, getFollowUpStatus]);

  const handleQuickActivity = async (mae: MaeComAtividade, tipo: TipoAtividade) => {
    if (!user) return;
    
    setSavingActivity(`${mae.id}-${tipo}`);
    
    const { error } = await supabase.from("atividades_mae").insert({
      mae_id: mae.id,
      user_id: user.id,
      tipo_atividade: tipo,
      descricao: null,
    });

    setSavingActivity(null);

    if (error) {
      console.error("Erro ao registrar atividade:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível registrar a atividade.",
      });
    } else {
      toast({
        title: "✓ Atividade registrada",
        description: `${TIPO_ATIVIDADE_LABELS[tipo]} para ${mae.nome_mae.split(" ")[0]}`,
      });
      onRefresh();
    }
  };

  const openDetailDialog = (mae: MaeComAtividade) => {
    setSelectedMae(mae);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">{stats.overdue}</p>
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
                <p className="text-2xl font-bold text-amber-600">{stats.warning}</p>
                <p className="text-xs text-muted-foreground">Atenção</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.ok}</p>
                <p className="text-xs text-muted-foreground">Em dia</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Processos ativos</p>
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

      {/* List */}
      <ScrollArea className="h-[calc(100vh-380px)] min-h-[400px]">
        <div className="space-y-2 pr-4">
          {configLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMaes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum processo ativo encontrado</p>
            </div>
          ) : (
            filteredMaes.map((mae) => {
              const status = getFollowUpStatus(mae.ultima_atividade_em, mae.status_processo, mae.data_ultima_atualizacao);
              const days = getDaysSinceLastActivity(mae.ultima_atividade_em, mae.data_ultima_atualizacao);
              
              return (
                <Card 
                  key={mae.id} 
                  className={`transition-all hover:shadow-md ${
                    status === "overdue" ? "border-l-4 border-l-destructive" :
                    status === "warning" ? "border-l-4 border-l-amber-500" :
                    status === "ok" ? "border-l-4 border-l-emerald-500" :
                    "border-l-4 border-l-muted"
                  }`}
                >
                  <CardContent className="p-3">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      {/* Info */}
                      <div 
                        className="flex-1 min-w-0 cursor-pointer" 
                        onClick={() => openDetailDialog(mae)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">{mae.nome_mae}</h4>
                          <FollowUpBadge status={status} daysSinceActivity={days} compact />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">{formatCpf(mae.cpf)}</span>
                          <span>•</span>
                          <Badge variant="outline" className="text-[10px] h-5">
                            {mae.status_processo.split(" ").slice(1).join(" ")}
                          </Badge>
                          {mae.ultima_atividade_em && (
                            <>
                              <span>•</span>
                              <span>
                                Último contato: {formatDistanceToNow(new Date(mae.ultima_atividade_em), { addSuffix: true, locale: ptBR })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex gap-1.5 shrink-0">
                        {(Object.keys(TIPO_ICONS) as TipoAtividade[]).map((tipo) => {
                          const Icon = TIPO_ICONS[tipo];
                          const isLoading = savingActivity === `${mae.id}-${tipo}`;
                          
                          return (
                            <Button
                              key={tipo}
                              size="sm"
                              className={`h-9 w-9 p-0 ${TIPO_COLORS[tipo]}`}
                              onClick={() => handleQuickActivity(mae, tipo)}
                              disabled={!!savingActivity}
                              title={TIPO_ATIVIDADE_LABELS[tipo]}
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Icon className="h-4 w-4" />
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Activity Dialog */}
      {selectedMae && (
        <AtividadeDialog
          mae={selectedMae}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onActivityAdded={onRefresh}
        />
      )}
    </div>
  );
}
