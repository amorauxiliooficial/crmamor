import { MaeProcesso } from "@/types/mae";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Baby, FolderOpen, AlertTriangle, FileWarning, KeyRound, Flame, MessageSquareWarning } from "lucide-react";
import { formatCpf } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";
import { useFollowUpStatus } from "@/hooks/useAtividades";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { calcularMesGravidez } from "@/lib/gestacaoUtils";
import { MarketingBadge } from "@/components/marketing/MarketingBadge";
import { formatarTempo, getAcompanhamentoMae } from "@/lib/maeAcompanhamento";

interface KanbanCardProps {
  mae: MaeProcesso & { ultima_atividade_em?: string | null };
  onClick: () => void;
  isDragging?: boolean;
  onOpenAtividades?: () => void;
  hasUnreadAlert?: boolean;
}

/** Retorna true se a gestante está a ≤30 dias do parto (DPP) — hora de gerar a GPS */
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
  const { getFollowUpStatus, configLoading } = useFollowUpStatus();
  const queryClient = useQueryClient();
  const acompanhamento = getAcompanhamentoMae(mae);
  
  const isActiveStatus = !mae.status_processo.toLowerCase().includes("aprovada") &&
    !mae.status_processo.toLowerCase().includes("indeferida") &&
    !mae.status_processo.toLowerCase().includes("encerrado");
  
  const followUpStatus = isActiveStatus && !configLoading
    ? getFollowUpStatus(mae.ultima_atividade_em, mae.status_processo, mae.data_ultima_atualizacao)
    : null;
  
  const toggleDAS = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (dasEstado === "oculto") {
      // Marcar como pendente
      const { error } = await supabase
        .from("mae_processo")
        .update({ precisa_das: true, das_concluido: false } as any)
        .eq("id", mae.id);
      if (error) { toast.error("Erro ao atualizar GPS"); return; }
      toast.success("GPS marcada como pendente", { duration: 3000, position: "top-center" });
    } else if (dasEstado === "pendente") {
      // Finalizar
      const { error } = await supabase
        .from("mae_processo")
        .update({ das_concluido: true } as any)
        .eq("id", mae.id);
      if (error) { toast.error("Erro ao atualizar GPS"); return; }
      toast.success("GPS finalizada com sucesso", { duration: 3000, position: "top-center" });
    } else {
      // Já concluído → voltar a oculto
      const { error } = await supabase
        .from("mae_processo")
        .update({ precisa_das: false, das_concluido: false } as any)
        .eq("id", mae.id);
      if (error) { toast.error("Erro ao atualizar GPS"); return; }
      toast.success("GPS removida", { duration: 3000, position: "top-center" });
    }
    queryClient.invalidateQueries({ queryKey: ["maes_data"] });
  };
  
  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all hover:shadow-md active:scale-[0.98] md:hover:ring-1 md:hover:ring-primary/20 relative",
        isDragging && "shadow-lg ring-1 ring-primary/40 rotate-2",
        followUpStatus === "overdue" && !hasUnreadAlert && "ring-1 ring-destructive/30",
        hasUnreadAlert && "ring-1 ring-primary/40",
        acompanhamento.contatoAtrasado && "border-l-2 border-l-primary/50",
        !acompanhamento.contatoAtrasado && acompanhamento.senhaAtrasada && "border-l-2 border-l-amber-400/60",
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
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-sm leading-tight line-clamp-2 min-w-0 flex-1">
              {mae.nome_mae}
            </h4>
            <div className="flex flex-wrap justify-end gap-1 shrink-0 max-w-[58%]">
              <MarketingBadge etiqueta={(mae as any).etiqueta ?? mae.etiqueta} compact />
            </div>
          </div>

          <p className="text-xs text-muted-foreground font-mono">
            {formatCpf(mae.cpf)}
          </p>

          <div className="flex flex-wrap gap-1.5 border-b border-border/60 pb-2">
              {mae.is_gestante && mesGestacao && (
                <Badge variant="outline" className="h-6 gap-1 border-primary/15 bg-primary/5 px-2 py-0 text-[10px] font-medium text-foreground">
                  <Baby className="h-3 w-3 text-primary" />
                  {mesGestacao}º mês
                </Badge>
              )}
              {dasEstado === "pendente" && (
                <Badge
                  variant="outline"
                  className={cn(
                    "h-6 cursor-pointer gap-1 border-destructive/25 bg-destructive/[0.07] px-2 py-0 text-[10px] font-medium text-foreground hover:bg-destructive/10"
                  )}
                  onClick={toggleDAS}
                  title="Clique para finalizar a GPS"
                >
                  <FileWarning className="h-3 w-3 text-destructive" />
                  GPS pendente
                </Badge>
              )}
              {dasEstado === "concluido" && (
                <Badge
                  variant="outline"
                  className="h-6 cursor-pointer gap-1 border-emerald-200 bg-emerald-50 px-2 py-0 text-[10px] font-medium text-foreground hover:bg-emerald-100/70 dark:border-emerald-800/60 dark:bg-emerald-950/25"
                  onClick={toggleDAS}
                  title="GPS finalizada — clique para remover"
                >
                  <FileWarning className="h-3 w-3 text-emerald-600 dark:text-emerald-300" />
                  GPS finalizada
                </Badge>
              )}
              {dasEstado === "oculto" && (
                <Badge
                  variant="outline"
                  className="h-6 cursor-pointer gap-1 px-2 py-0 text-[10px] opacity-0 transition-opacity hover:bg-destructive/10 group-hover:opacity-100"
                  onClick={toggleDAS}
                  title="Marcar GPS como pendente"
                >
                  <FileWarning className="h-3 w-3" />
                </Badge>
              )}
              {(mae as any).ja_trabalhou && (
                <Badge variant="outline" className="h-6 gap-1 border-amber-200 bg-amber-50 px-2 py-0 text-[10px] font-medium text-foreground dark:border-amber-800/60 dark:bg-amber-950/25">
                  <Flame className="h-3 w-3 text-amber-700 dark:text-amber-300" />
                  Quente
                </Badge>
              )}
          </div>

          {(acompanhamento.contatoAtrasado || acompanhamento.senhaAtrasada) && (
            <div className="grid gap-1.5">
              {acompanhamento.contatoAtrasado && (
                <div className="flex items-center gap-1.5 rounded-lg border border-primary/15 bg-primary/5 px-2.5 py-1.5 text-[10px] font-medium text-foreground">
                  <MessageSquareWarning className="h-3 w-3 shrink-0 text-primary" />
                  <span>Sem contato {formatarTempo(acompanhamento.diasSemContato)}</span>
                </div>
              )}
              {acompanhamento.senhaAtrasada && (
                <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-medium text-foreground dark:border-amber-800/60 dark:bg-amber-950/25">
                  <KeyRound className="h-3 w-3 shrink-0 text-amber-700 dark:text-amber-300" />
                  <span>Sem senha {formatarTempo(acompanhamento.diasSemSenha)}</span>
                </div>
              )}
            </div>
          )}

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
            {mae.senha_gov && (
              <span className="flex items-center gap-1 font-mono text-[10px] bg-muted/50 px-1.5 py-0.5 rounded w-fit">
                <KeyRound className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[120px]" title={mae.senha_gov}>
                  {mae.senha_gov}
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
