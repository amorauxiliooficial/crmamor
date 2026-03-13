import { MaeProcesso } from "@/types/mae";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Baby, FolderOpen, AlertTriangle, FileWarning } from "lucide-react";
import { formatCpf } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { differenceInDays, differenceInMonths, parseISO } from "date-fns";
import { FollowUpBadge } from "@/components/atividades/FollowUpBadge";
import { useFollowUpStatus } from "@/hooks/useAtividades";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface KanbanCardProps {
  mae: MaeProcesso & { ultima_atividade_em?: string | null };
  onClick: () => void;
  isDragging?: boolean;
  onOpenAtividades?: () => void;
  hasUnreadAlert?: boolean;
}

function calcularMesGravidez(mae: MaeProcesso): number | null {
  if (!mae.is_gestante) return null;
  
  if (mae.mes_gestacao !== null && mae.mes_gestacao !== undefined) {
    return mae.mes_gestacao;
  }
  
  if (!mae.data_evento || mae.data_evento_tipo !== "DPP") return null;
  
  const dpp = parseISO(mae.data_evento);
  const hoje = new Date();
  
  const diasDesdePartio = Math.floor((hoje.getTime() - dpp.getTime()) / (1000 * 60 * 60 * 24));
  if (diasDesdePartio > 30) return null;
  if (dpp < hoje) return 9;
  
  const mesesAteParto = differenceInMonths(dpp, hoje);
  return Math.max(1, Math.min(9, 9 - mesesAteParto));
}

/** Retorna true se a gestante está a ≤30 dias do parto (DPP) — hora de gerar o DAS */
function verificarDASAuto(mae: MaeProcesso): boolean {
  if (!mae.is_gestante || !mae.data_evento || mae.data_evento_tipo !== "DPP") return false;
  const dpp = parseISO(mae.data_evento);
  const hoje = new Date();
  if (dpp < hoje) return false;
  const dias = differenceInDays(dpp, hoje);
  return dias <= 30;
}

export function KanbanCard({
  mae, 
  onClick, 
  isDragging, 
  onOpenAtividades,
  hasUnreadAlert = false,
}: KanbanCardProps) {
  const mesGestacao = calcularMesGravidez(mae);
  const dasAuto = verificarDASAuto(mae);
  const mostrarDAS = dasAuto || mae.precisa_das;
  const dasEstado = mae.das_concluido ? "concluido" : mostrarDAS ? "pendente" : "oculto";
  const { getFollowUpStatus, getDaysSinceLastActivity, configLoading } = useFollowUpStatus();
  const queryClient = useQueryClient();
  
  const isActiveStatus = !mae.status_processo.toLowerCase().includes("aprovada") &&
    !mae.status_processo.toLowerCase().includes("indeferida") &&
    !mae.status_processo.toLowerCase().includes("encerrado");
  
  const followUpStatus = isActiveStatus && !configLoading
    ? getFollowUpStatus(mae.ultima_atividade_em, mae.status_processo, mae.data_ultima_atualizacao)
    : null;
  
  const daysSinceActivity = getDaysSinceLastActivity(
    mae.ultima_atividade_em,
    mae.data_ultima_atualizacao
  );

  const toggleDAS = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (dasEstado === "oculto") {
      // Marcar como pendente
      const { error } = await supabase
        .from("mae_processo")
        .update({ precisa_das: true, das_concluido: false } as any)
        .eq("id", mae.id);
      if (error) { toast.error("Erro ao atualizar DAS"); return; }
      toast.success("✅ DAS marcado como pendente", { duration: 3000, position: "top-center" });
    } else if (dasEstado === "pendente") {
      // Finalizar
      const { error } = await supabase
        .from("mae_processo")
        .update({ das_concluido: true } as any)
        .eq("id", mae.id);
      if (error) { toast.error("Erro ao atualizar DAS"); return; }
      toast.success("✅ DAS finalizado com sucesso", { duration: 3000, position: "top-center" });
    } else {
      // Já concluído → voltar a oculto
      const { error } = await supabase
        .from("mae_processo")
        .update({ precisa_das: false, das_concluido: false } as any)
        .eq("id", mae.id);
      if (error) { toast.error("Erro ao atualizar DAS"); return; }
      toast.success("DAS removido", { duration: 3000, position: "top-center" });
    }
    queryClient.invalidateQueries({ queryKey: ["maes_data"] });
  };
  
  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all hover:shadow-md active:scale-[0.98] md:hover:ring-1 md:hover:ring-primary/20 relative",
        isDragging && "shadow-lg ring-1 ring-primary/40 rotate-2",
        followUpStatus === "overdue" && !hasUnreadAlert && "ring-1 ring-destructive/30",
        hasUnreadAlert && "ring-1 ring-primary/40"
      )}
      onClick={onClick}
    >
      {/* Badge de alerta do admin */}
      {hasUnreadAlert && (
        <div className="absolute top-1.5 right-1.5 z-10">
          <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5 gap-1">
            <AlertTriangle className="h-3 w-3" />
            Aviso
          </Badge>
        </div>
      )}
      
      <CardContent className={cn("p-2.5 md:p-3 relative")}>
        <div className="space-y-1.5 md:space-y-2">
          <div className="flex items-start justify-between gap-1.5">
            <h4 className="font-medium text-sm leading-tight line-clamp-2">
              {mae.nome_mae}
            </h4>
            <div className="flex gap-0.5 shrink-0">
              {followUpStatus && (
                <FollowUpBadge
                  status={followUpStatus}
                  daysSinceActivity={daysSinceActivity}
                  compact
                />
              )}
              {mostrarDAS && (
                <Badge
                  variant="destructive"
                  className={cn(
                    "text-[10px] px-1.5 py-0 h-5 gap-0.5 cursor-pointer hover:opacity-80",
                    dasAuto && "animate-pulse"
                  )}
                  onClick={toggleDAS}
                  title={mae.precisa_das ? "Clique para finalizar DAS" : "Clique para finalizar DAS (automático)"}
                >
                  <FileWarning className="h-2.5 w-2.5" />
                  DAS
                </Badge>
              )}
              {!mostrarDAS && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-5 gap-0.5 cursor-pointer hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={toggleDAS}
                  title="Marcar DAS como pendente"
                >
                  <FileWarning className="h-2.5 w-2.5" />
                </Badge>
              )}
              {mae.is_gestante && mesGestacao && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-accent text-accent-foreground">
                  <Baby className="h-2.5 w-2.5 mr-0.5" />
                  {mesGestacao}º
                </Badge>
              )}
              {mae.contrato_assinado && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 hidden sm:flex">
                  Contrato
                </Badge>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground font-mono">
            {formatCpf(mae.cpf)}
          </p>

          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
              {mae.tipo_evento}
            </Badge>
            {mae.uf && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                {mae.uf}
              </Badge>
            )}
          </div>

          <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2">
              {mae.data_evento && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(mae.data_evento).toLocaleDateString("pt-BR")}
                </span>
              )}
              {mae.link_documentos && (
                <span className="flex items-center gap-1 text-primary" title="Documentos anexados">
                  <FolderOpen className="h-3 w-3 fill-current" />
                </span>
              )}
            </div>
            {mae.protocolo_inss && (
              <span className="flex items-center gap-1 font-mono text-[10px] bg-muted/50 px-1.5 py-0.5 rounded w-fit">
                <FileText className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[120px]" title={mae.protocolo_inss}>
                  {mae.protocolo_inss}
                </span>
              </span>
            )}
          </div>

          {mae.observacoes && (
            <p className="text-[11px] text-muted-foreground italic line-clamp-2 border-t pt-1.5">
              {mae.observacoes}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
