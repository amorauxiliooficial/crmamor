import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, XCircle, User, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface ConferenciaHistoricoProps {
  maeId: string;
}

interface Conferencia {
  id: string;
  houve_atualizacao: boolean;
  observacoes: string | null;
  created_at: string;
  user_id: string;
  user_email?: string;
}

export function ConferenciaHistorico({ maeId }: ConferenciaHistoricoProps) {
  const [conferencias, setConferencias] = useState<Conferencia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConferencias = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("conferencia_inss")
        .select("*")
        .eq("mae_id", maeId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching conferencias:", error);
        setLoading(false);
        return;
      }

      // Fetch user emails for each conferencia
      const userIds = [...new Set(data.map((c) => c.user_id))];
      const userEmails: Record<string, string> = {};

      for (const userId of userIds) {
        const { data: userData } = await supabase.auth.admin.getUserById(userId).catch(() => ({ data: null }));
        // Since we can't use admin API, we'll just show the user_id or a fallback
        userEmails[userId] = userId.slice(0, 8) + "...";
      }

      setConferencias(
        data.map((c) => ({
          ...c,
          user_email: userEmails[c.user_id],
        }))
      );
      setLoading(false);
    };

    if (maeId) {
      fetchConferencias();
    }
  }, [maeId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (conferencias.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Nenhuma conferência registrada</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px] pr-4">
      <div className="space-y-3">
        {conferencias.map((conf) => (
          <div
            key={conf.id}
            className="border rounded-lg p-3 space-y-2 bg-muted/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {conf.houve_atualizacao ? (
                  <Badge variant="default" className="bg-emerald-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Atualização
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <XCircle className="h-3 w-3 mr-1" />
                    Sem atualização
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(conf.created_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>

            {conf.observacoes && (
              <p className="text-sm text-foreground/80">{conf.observacoes}</p>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>Conferido por: {conf.user_email}</span>
              <span>•</span>
              <span>
                {format(new Date(conf.created_at), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
