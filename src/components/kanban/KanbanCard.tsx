import { MaeProcesso } from "@/types/mae";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Baby, FolderOpen, Phone, MessageCircle } from "lucide-react";
import { formatCpf } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { differenceInMonths, parseISO } from "date-fns";
import { FollowUpBadge } from "@/components/atividades/FollowUpBadge";
import { useFollowUpStatus } from "@/hooks/useAtividades";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface KanbanCardProps {
  mae: MaeProcesso & { ultima_atividade_em?: string | null };
  onClick: () => void;
  isDragging?: boolean;
  onOpenAtividades?: () => void;
  onQuickActivity?: (tipo: "ligacao" | "whatsapp") => void;
  userProfile?: UserProfile | null;
}

function calcularMesGravidez(mae: MaeProcesso): number | null {
  if (!mae.is_gestante) return null;
  
  // Se tem mês manual definido, usa ele
  if (mae.mes_gestacao !== null && mae.mes_gestacao !== undefined) {
    return mae.mes_gestacao;
  }
  
  // Caso contrário, calcula baseado na DPP
  if (!mae.data_evento || mae.data_evento_tipo !== "DPP") return null;
  
  const dpp = parseISO(mae.data_evento);
  const hoje = new Date();
  
  const diasDesdePartio = Math.floor((hoje.getTime() - dpp.getTime()) / (1000 * 60 * 60 * 24));
  if (diasDesdePartio > 30) return null;
  if (dpp < hoje) return 9;
  
  const mesesAteParto = differenceInMonths(dpp, hoje);
  return Math.max(1, Math.min(9, 9 - mesesAteParto));
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return "??";
}

export function KanbanCard({ 
  mae, 
  onClick, 
  isDragging, 
  onOpenAtividades,
  onQuickActivity,
  userProfile
}: KanbanCardProps) {
  const mesGestacao = calcularMesGravidez(mae);
  const { getFollowUpStatus, getDaysSinceLastActivity, configLoading } = useFollowUpStatus();
  
  // Não mostrar badge para status finais
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
  
  const userName = userProfile?.full_name || userProfile?.email?.split("@")[0] || null;
  
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md active:scale-[0.98] md:hover:ring-2 md:hover:ring-primary/20",
        isDragging && "shadow-lg ring-2 ring-primary rotate-2",
        followUpStatus === "overdue" && "ring-1 ring-destructive/50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-2.5 md:p-3">
        <div className="space-y-1.5 md:space-y-2">
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {userProfile && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="h-5 w-5 shrink-0 text-[9px]">
                        <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-medium">
                          {getInitials(userProfile.full_name, userProfile.email)}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {userName || "Sem atribuição"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <h4 className="font-medium text-sm leading-tight line-clamp-2">
                {mae.nome_mae}
              </h4>
            </div>
            <div className="flex gap-0.5 shrink-0">
              {followUpStatus && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAtividades?.();
                  }}
                  className="hover:scale-110 transition-transform"
                  title="Ver atividades"
                >
                  <FollowUpBadge
                    status={followUpStatus}
                    daysSinceActivity={daysSinceActivity}
                    compact
                  />
                </button>
              )}
              {mae.is_gestante && mesGestacao && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
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

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {mae.data_evento && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(mae.data_evento).toLocaleDateString("pt-BR")}
              </span>
            )}
            {mae.protocolo_inss && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Protocolo
              </span>
            )}
            {mae.link_documentos && (
              <span className="flex items-center gap-1 text-primary" title="Documentos anexados">
                <FolderOpen className="h-3 w-3 fill-current" />
              </span>
            )}
          </div>

          {/* Quick Activity Buttons */}
          {onQuickActivity && isActiveStatus && (
            <div className="flex gap-1 pt-1 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] gap-1 flex-1 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:text-blue-400"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickActivity("ligacao");
                }}
              >
                <Phone className="h-3 w-3" />
                Ligação
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] gap-1 flex-1 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950 dark:hover:text-green-400"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickActivity("whatsapp");
                }}
              >
                <MessageCircle className="h-3 w-3" />
                WhatsApp
              </Button>
            </div>
          )}

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
