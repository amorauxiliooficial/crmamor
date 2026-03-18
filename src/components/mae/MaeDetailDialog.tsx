import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { MaeProcesso, STATUS_COLORS } from "@/types/mae";
import { formatCpf, formatDate } from "@/lib/formatters";
import {
  Pencil,
  Calendar,
  FileText,
  MapPin,
  Phone,
  Mail,
  User,
  ClipboardList,
  MessageSquare,
  Copy,
  Key,
  ShieldCheck,
  FolderOpen,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DocumentosDialog } from "@/components/mae/DocumentosDialog";

interface MaeDetailDialogProps {
  mae: MaeProcesso | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (mae: MaeProcesso) => void;
}

const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  } catch (err) {
    toast.error("Erro ao copiar");
  }
};

export function MaeDetailDialog({
  mae,
  open,
  onOpenChange,
  onEdit,
}: MaeDetailDialogProps) {
  const [documentosDialogOpen, setDocumentosDialogOpen] = useState(false);

  if (!mae) return null;

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
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground font-mono">
                  CPF: {formatCpf(mae.cpf)}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(mae.cpf, "CPF")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>


        <div className="space-y-6">
          {/* Status Badge and Actions */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(mae);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  "text-sm px-3 py-1",
                  STATUS_COLORS[mae.status_processo]
                )}
                variant="outline"
              >
                {mae.status_processo}
              </Badge>
              {mae.contrato_assinado && (
                <Badge variant="secondary">Contrato Assinado</Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDocumentosDialogOpen(true)}
              className="gap-2"
            >
              <FolderOpen className="h-4 w-4" />
              Documentos
            </Button>
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
              <InfoItemWithCopy icon={Phone} label="Telefone" value={mae.telefone} onCopy={() => copyToClipboard(mae.telefone!, "Telefone")} />
            )}
            {mae.email && (
              <InfoItemWithCopy icon={Mail} label="Email" value={mae.email} onCopy={() => copyToClipboard(mae.email!, "Email")} />
            )}
            {/* senha_gov removida daqui - agora está no card destacado acima */}
            <InfoItem
              icon={ShieldCheck}
              label="Verificação 2 Etapas"
              value={mae.verificacao_duas_etapas ? "Sim" : "Não"}
            />
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

        <DocumentosDialog
          open={documentosDialogOpen}
          onOpenChange={setDocumentosDialogOpen}
          maeId={mae.id}
          maeNome={mae.nome_mae}
          linkDocumentos={mae.link_documentos || null}
          onSuccess={() => {}}
        />
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

interface InfoItemWithCopyProps extends InfoItemProps {
  onCopy: () => void;
}

function InfoItemWithCopy({ icon: Icon, label, value, onCopy }: InfoItemWithCopyProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{value}</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onCopy}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SenhaGovCard({ senha }: { senha: string }) {
  const [revealed, setRevealed] = useState(false);
  const masked = "•".repeat(Math.max(senha.length, 8));
  const partial = senha.length >= 4
    ? `${senha.slice(0, 2)}${"•".repeat(senha.length - 4)}${senha.slice(-2)}`
    : masked;

  const handleReveal = useCallback(() => {
    setRevealed(true);
  }, []);

  useEffect(() => {
    if (!revealed) return;
    const timer = setTimeout(() => setRevealed(false), 10000);
    return () => clearTimeout(timer);
  }, [revealed]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(senha);
      toast.success("Senha gov.br copiada!");
    } catch {
      toast.error("Erro ao copiar senha");
    }
  };

  return (
    <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Key className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-primary">Senha gov.br</span>
        {revealed && (
          <Badge variant="secondary" className="text-[10px] ml-auto animate-pulse">
            Visível por 10s
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-3">
        <p className="text-lg font-mono font-semibold tracking-wider flex-1 select-none">
          {revealed ? senha : partial}
        </p>
        <Button
          size="sm"
          onClick={handleCopy}
          className="gap-1.5 shrink-0"
        >
          <Copy className="h-4 w-4" />
          Copiar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => revealed ? setRevealed(false) : handleReveal()}
          className="gap-1.5 shrink-0"
        >
          {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {revealed ? "Ocultar" : "Revelar"}
        </Button>
      </div>
    </div>
  );
}
