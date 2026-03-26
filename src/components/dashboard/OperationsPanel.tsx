import { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_ORDER, StatusProcesso } from "@/types/mae";
import {
  MessageSquare,
  Users,
  Clock,
  Inbox,
  ArrowRight,
  Filter,
  Phone,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OperationsPanelProps {
  totalMaes: number;
  filteredCount: number;
}

interface ChatStats {
  totalUnread: number;
  waitingResponse: number;
  newConversations: number;
  openConversations: number;
}

function useChatStats(): { stats: ChatStats; isLoading: boolean } {
  const queryClient = useQueryClient();

  // Realtime subscription to invalidate stats on conversation changes
  useEffect(() => {
    const channel = supabase
      .channel("home-chat-stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wa_conversations" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat_stats_home"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data, isLoading } = useQuery({
    queryKey: ["chat_stats_home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wa_conversations")
        .select("status, unread_count, last_inbound_at, assigned_to")
        .in("status", ["open", "new", "em_atendimento", "aguardando_cliente"]);

      if (error) throw error;
      const convs = data || [];

      let totalUnread = 0;
      let waitingResponse = 0;
      let newConversations = 0;
      let openConversations = 0;

      for (const c of convs) {
        totalUnread += c.unread_count || 0;
        if (c.status === "new") newConversations++;
        if (c.status === "open" || c.status === "em_atendimento" || c.status === "aguardando_cliente") openConversations++;
        if (c.last_inbound_at && c.unread_count > 0) waitingResponse++;
      }

      return { totalUnread, waitingResponse, newConversations, openConversations } as ChatStats;
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  return { stats: data || { totalUnread: 0, waitingResponse: 0, newConversations: 0, openConversations: 0 }, isLoading };
}

export function OperationsPanel({
  totalMaes,
  filteredCount,
  selectedUserId,
  onUserChange,
  statusFilter,
  onStatusFilterChange,
  users,
  getUserDisplayName,
}: OperationsPanelProps) {
  const navigate = useNavigate();
  const { stats } = useChatStats();

  const hasUrgent = stats.waitingResponse > 0 || stats.newConversations > 0;

  return (
    <div className="space-y-3">
      {/* Top row: Chat CTA + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Chat Access Card - Main CTA */}
        <Card
          className={cn(
            "md:col-span-1 cursor-pointer transition-all duration-200 hover:scale-[1.01] border-primary/30 hover:border-primary/60",
            hasUrgent && "ring-1 ring-primary/40"
          )}
          onClick={() => navigate("/atendimento")}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
              hasUrgent ? "bg-primary/20" : "bg-muted"
            )}>
              <MessageSquare className={cn("h-6 w-6", hasUrgent ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Atendimento</h3>
                {stats.totalUnread > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0 h-5">
                    {stats.totalUnread}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {hasUrgent ? "Conversas aguardando" : "Abrir chat"}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardContent>
        </Card>

        {/* Stats cards */}
        <div className="md:col-span-2 grid grid-cols-3 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Inbox className="h-4 w-4 text-primary" />
                {stats.newConversations > 0 && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                )}
              </div>
              <p className="text-xl font-bold tabular-nums">{stats.newConversations}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Na Fila</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3 text-center">
              <Clock className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold tabular-nums">{stats.waitingResponse}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Aguardando</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-3 text-center">
              <Users className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-xl font-bold tabular-nums">{totalMaes}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Processos</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        
        <Select value={selectedUserId || "all"} onValueChange={onUserChange}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos responsáveis</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {getUserDisplayName(u)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as StatusProcesso | "all" | "gestantes")}>
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="gestantes">🤰 Gestantes</SelectItem>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(statusFilter !== "all" || (selectedUserId && selectedUserId !== "all")) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              onStatusFilterChange("all");
              onUserChange("all");
            }}
          >
            Limpar filtros
          </Button>
        )}

        {filteredCount !== totalMaes && (
          <Badge variant="secondary" className="text-xs h-6">
            {filteredCount} de {totalMaes}
          </Badge>
        )}
      </div>
    </div>
  );
}
