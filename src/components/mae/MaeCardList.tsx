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
  FileWarning,
} from "lucide-react";
import { formatCpf } from "@/lib/formatters";
import { format, parseISO, differenceInMonths, differenceInDays } from "date-fns";
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

function verificarDAS(mae: MaeProcesso): boolean {
  if (!mae.is_gestante || !mae.data_evento || mae.data_evento_tipo !== "DPP") return false;
  const dpp = parseISO(mae.data_evento);
  const hoje = new Date();
  if (dpp < hoje) return false;
  return differenceInDays(dpp, hoje) <= 30;
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
    <div className="space-y-2 px-1">
      {maes.map((mae) => {
        const mesGestacao = calcularMesGravidez(mae);
        const precisaDAS = verificarDAS(mae);
        const statusLabel = mae.status_processo.split(" ").slice(1).join(" ") || mae.status_processo;
        const emoji = mae.status_processo.split(" ")[0];

        return (
          <Card
            key={mae.id}
            className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99] rounded-xl"
            onClick={() => onCardClick(mae)}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="font-semibold text-sm truncate">
                      {mae.nome_mae}
                    </h3>
                    {mae.is_gestante && mesGestacao && (
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-[10px] px-1.5 py-0 h-4 bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                      >
                        <Baby className="h-2.5 w-2.5 mr-0.5" />
                        {mesGestacao}º
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {formatCpf(mae.cpf)}
                  </p>
                </div>

                <div className="flex items-center gap-0.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-3.5 w-3.5" />
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
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                <Badge variant={getStatusBadgeVariant(mae.status_processo)} className="text-[10px] px-1.5 py-0 h-5">
                  {emoji} {statusLabel}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                  {mae.tipo_evento}
                </Badge>
                {mae.uf && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                    {mae.uf}
                  </Badge>
                )}
                {mae.contrato_assinado && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                    Contrato ✓
                  </Badge>
                )}
                {precisaDAS && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 gap-0.5 animate-pulse">
                    <FileWarning className="h-2.5 w-2.5" />
                    DAS
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                {mae.data_evento && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(parseISO(mae.data_evento), "dd/MM/yy")}
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
