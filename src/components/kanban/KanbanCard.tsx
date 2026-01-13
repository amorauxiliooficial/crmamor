import { MaeProcesso } from "@/types/mae";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, Baby, FolderOpen } from "lucide-react";
import { formatCpf } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { differenceInMonths, parseISO } from "date-fns";

interface KanbanCardProps {
  mae: MaeProcesso;
  onClick: () => void;
  isDragging?: boolean;
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

export function KanbanCard({ mae, onClick, isDragging }: KanbanCardProps) {
  const mesGestacao = calcularMesGravidez(mae);
  
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md active:scale-[0.98] md:hover:ring-2 md:hover:ring-primary/20",
        isDragging && "shadow-lg ring-2 ring-primary rotate-2"
      )}
      onClick={onClick}
    >
      <CardContent className="p-2.5 md:p-3">
        <div className="space-y-1.5 md:space-y-2">
          <div className="flex items-start justify-between gap-1.5">
            <h4 className="font-medium text-sm leading-tight line-clamp-2">
              {mae.nome_mae}
            </h4>
            <div className="flex gap-0.5 shrink-0">
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
