import { useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Clock, Phone, ChevronRight } from "lucide-react";
import { MaeProcesso } from "@/types/mae";
import { useFollowUpStatus } from "@/hooks/useAtividades";
import { FollowUpBadge } from "./FollowUpBadge";
import { formatCpf } from "@/lib/formatters";

interface MaeComUrgencia extends MaeProcesso {
  urgencyStatus: "ok" | "warning" | "overdue" | "no-activity";
  daysSinceActivity: number;
  ultimaAtividadeEm?: string | null;
}

interface PendenciasPanelProps {
  maes: (MaeProcesso & { ultima_atividade_em?: string | null })[];
  onMaeClick: (mae: MaeProcesso) => void;
  onPlaySound?: () => void;
}

export function PendenciasPanel({ maes, onMaeClick, onPlaySound }: PendenciasPanelProps) {
  const { getFollowUpStatus, getDaysSinceLastActivity, configLoading } = useFollowUpStatus();
  const previousOverdueCount = useRef(0);

  const maesComUrgencia: MaeComUrgencia[] = useMemo(() => {
    if (configLoading) return [];

    return maes
      .map((mae) => {
        const status = getFollowUpStatus(
          mae.ultima_atividade_em,
          mae.status_processo,
          mae.data_ultima_atualizacao
        );
        const days = getDaysSinceLastActivity(
          mae.ultima_atividade_em,
          mae.data_ultima_atualizacao
        );
        return {
          ...mae,
          urgencyStatus: status,
          daysSinceActivity: days,
          ultimaAtividadeEm: mae.ultima_atividade_em,
        };
      })
      // Filtra apenas status ativo (não inclui aprovada, indeferida, processo encerrado)
      .filter((mae) => {
        const statusLower = mae.status_processo.toLowerCase();
        return (
          !statusLower.includes("aprovada") &&
          !statusLower.includes("indeferida") &&
          !statusLower.includes("encerrado")
        );
      })
      // Ordena por urgência: overdue > warning > no-activity > ok
      .sort((a, b) => {
        const priorityOrder = { overdue: 0, warning: 1, "no-activity": 2, ok: 3 };
        const priorityDiff = priorityOrder[a.urgencyStatus] - priorityOrder[b.urgencyStatus];
        if (priorityDiff !== 0) return priorityDiff;
        // Dentro da mesma prioridade, ordena por dias (mais antigo primeiro)
        return b.daysSinceActivity - a.daysSinceActivity;
      });
  }, [maes, getFollowUpStatus, getDaysSinceLastActivity, configLoading]);

  const overdueCount = maesComUrgencia.filter((m) => m.urgencyStatus === "overdue").length;
  const warningCount = maesComUrgencia.filter((m) => m.urgencyStatus === "warning").length;

  // Play sound when new overdue items appear
  useEffect(() => {
    if (overdueCount > previousOverdueCount.current && onPlaySound) {
      onPlaySound();
    }
    previousOverdueCount.current = overdueCount;
  }, [overdueCount, onPlaySound]);

  if (configLoading) {
    return null;
  }

  const urgentMaes = maesComUrgencia.filter(
    (m) => m.urgencyStatus === "overdue" || m.urgencyStatus === "warning"
  );

  if (urgentMaes.length === 0) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-destructive bg-destructive/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Follow-ups Pendentes
          <Badge variant="destructive" className="ml-auto">
            {overdueCount > 0 && `${overdueCount} atrasado${overdueCount > 1 ? "s" : ""}`}
            {overdueCount > 0 && warningCount > 0 && " • "}
            {warningCount > 0 && `${warningCount} urgente${warningCount > 1 ? "s" : ""}`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="max-h-[200px]">
          <div className="space-y-2">
            {urgentMaes.slice(0, 10).map((mae) => (
              <div
                key={mae.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-background/80 cursor-pointer transition-colors"
                onClick={() => onMaeClick(mae)}
              >
                <FollowUpBadge
                  status={mae.urgencyStatus}
                  daysSinceActivity={mae.daysSinceActivity}
                  compact
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{mae.nome_mae}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {mae.status_processo.replace(/^[\p{Emoji}\s]+/u, "")}
                  </p>
                </div>
                {mae.telefone && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`tel:${mae.telefone}`, "_blank");
                    }}
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </Button>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        </ScrollArea>
        {urgentMaes.length > 10 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            +{urgentMaes.length - 10} outros pendentes
          </p>
        )}
      </CardContent>
    </Card>
  );
}
