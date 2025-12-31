import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MaeProcesso, STATUS_COLORS } from "@/types/mae";
import { formatCpf, formatDate } from "@/lib/formatters";
import {
  Calendar,
  FileText,
  MapPin,
  Phone,
  Mail,
  User,
  ClipboardList,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MaeDetailDialogProps {
  mae: MaeProcesso | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaeDetailDialog({
  mae,
  open,
  onOpenChange,
}: MaeDetailDialogProps) {
  if (!mae) return null;

  const statusEmoji = mae.status_processo.split(" ")[0];
  const statusLabel = mae.status_processo.split(" ").slice(1).join(" ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">{mae.nome_mae}</DialogTitle>
              <p className="text-sm text-muted-foreground font-mono">
                CPF: {formatCpf(mae.cpf)}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge
              className={cn(
                "text-sm px-3 py-1",
                STATUS_COLORS[mae.status_processo]
              )}
              variant="outline"
            >
              {statusEmoji} {statusLabel}
            </Badge>
            {mae.contrato_assinado && (
              <Badge variant="secondary">Contrato Assinado</Badge>
            )}
          </div>

          <Separator />

          {/* Info Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            <InfoItem
              icon={ClipboardList}
              label="Tipo de Evento"
              value={mae.tipo_evento}
            />
            <InfoItem
              icon={Calendar}
              label={mae.data_evento_tipo || "Data do Evento"}
              value={mae.data_evento ? formatDate(mae.data_evento) : "Não informado"}
            />
            <InfoItem
              icon={User}
              label="Categoria Previdenciária"
              value={mae.categoria_previdenciaria}
            />
            <InfoItem
              icon={MapPin}
              label="UF"
              value={mae.uf || "Não informado"}
            />
            {mae.telefone && (
              <InfoItem icon={Phone} label="Telefone" value={mae.telefone} />
            )}
            {mae.email && (
              <InfoItem icon={Mail} label="Email" value={mae.email} />
            )}
          </div>

          {/* Protocolo INSS */}
          {mae.protocolo_inss && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Protocolo INSS
                </h4>
                <p className="text-sm font-mono bg-muted p-2 rounded">
                  {mae.protocolo_inss}
                </p>
              </div>
            </>
          )}

          {/* Parcelas */}
          {mae.parcelas && (
            <div className="space-y-2">
              <h4 className="font-semibold">Parcelas</h4>
              <p className="text-sm">{mae.parcelas}</p>
            </div>
          )}

          {/* Segurada e GPS */}
          {(mae.segurada || mae.precisa_gps) && (
            <>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                {mae.segurada && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Segurada:
                    </span>
                    <p className="font-medium">{mae.segurada}</p>
                  </div>
                )}
                {mae.precisa_gps && (
                  <div>
                    <span className="text-sm text-muted-foreground">
                      Precisa GPS:
                    </span>
                    <p className="font-medium">{mae.precisa_gps}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Observações */}
          {mae.observacoes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Observações
                </h4>
                <p className="text-sm bg-accent/50 p-3 rounded-lg">
                  {mae.observacoes}
                </p>
              </div>
            </>
          )}

          {/* Metadata */}
          <Separator />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Origem: {mae.origem || "Não informado"}</span>
            <span>
              Última atualização: {formatDate(mae.data_ultima_atualizacao)}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface InfoItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function InfoItem({ icon: Icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-sm">{value}</p>
      </div>
    </div>
  );
}
