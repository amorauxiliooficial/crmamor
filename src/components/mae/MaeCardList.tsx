import { MaeProcesso } from "@/types/mae";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Phone,
  Mail,
  FileText,
  Baby,
  ChevronRight,
  MoreVertical,
  Copy,
} from "lucide-react";
import { formatCpf } from "@/lib/formatters";
import { format, parseISO, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface MaeCardListProps {
  maes: MaeProcesso[];
  onCardClick: (mae: MaeProcesso) => void;
}

const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  } catch (err) {
    toast.error("Erro ao copiar");
  }
};

function calcularMesGravidez(mae: MaeProcesso): number | null {
  if (!mae.is_gestante) return null;
  if (mae.mes_gestacao !== null && mae.mes_gestacao !== undefined) {
    return mae.mes_gestacao;
  }
  if (!mae.data_evento || mae.data_evento_tipo !== "DPP") return null;
  const dpp = parseISO(mae.data_evento);
  const hoje = new Date();
  if (dpp < hoje) return null;
  const mesesAteParto = differenceInMonths(dpp, hoje);
  return Math.max(1, Math.min(9, 9 - mesesAteParto));
}

const getStatusBadgeVariant = (status: string) => {
  if (status.includes("Aprovada")) return "default";
  if (status.includes("Indeferida")) return "destructive";
  if (status.includes("Pendência")) return "secondary";
  if (status.includes("Análise")) return "outline";
  return "outline";
};

export function MaeCardList({ maes, onCardClick }: MaeCardListProps) {
  if (maes.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Nenhum processo encontrado
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {maes.map((mae) => {
        const mesGestacao = calcularMesGravidez(mae);
        const statusLabel = mae.status_processo.split(" ").slice(1).join(" ") || mae.status_processo;
        const emoji = mae.status_processo.split(" ")[0];

        return (
          <Card
            key={mae.id}
            className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
            onClick={() => onCardClick(mae)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-base truncate">
                      {mae.nome_mae}
                    </h3>
                    {mae.is_gestante && mesGestacao && (
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-xs bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                      >
                        <Baby className="h-3 w-3 mr-1" />
                        {mesGestacao}º
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    {formatCpf(mae.cpf)}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(mae.cpf, "CPF");
                      }}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar CPF
                      </DropdownMenuItem>
                      {mae.telefone && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(mae.telefone!, "Telefone");
                        }}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar Telefone
                        </DropdownMenuItem>
                      )}
                      {mae.senha_gov && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(mae.senha_gov!, "Senha Gov");
                        }}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar Senha Gov
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                <Badge variant={getStatusBadgeVariant(mae.status_processo)} className="text-xs">
                  {emoji} {statusLabel}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {mae.tipo_evento}
                </Badge>
                {mae.uf && (
                  <Badge variant="outline" className="text-xs">
                    {mae.uf}
                  </Badge>
                )}
                {mae.contrato_assinado && (
                  <Badge variant="secondary" className="text-xs">
                    Contrato ✓
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
                {mae.data_evento && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(parseISO(mae.data_evento), "dd/MM/yyyy")}
                  </span>
                )}
                {mae.telefone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {mae.telefone}
                  </span>
                )}
                {mae.protocolo_inss && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Protocolo
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
