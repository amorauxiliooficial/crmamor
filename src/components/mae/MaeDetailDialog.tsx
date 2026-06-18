import { useState, useEffect, useCallback } from "react";
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Copy,
  Key,
  ShieldCheck,
  FolderOpen,
  Eye,
  EyeOff,
  MessageSquare,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DocumentosDialog } from "@/components/mae/DocumentosDialog";
import { ObservacoesHistorico } from "@/components/mae/ObservacoesHistorico";

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
  } catch {
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
  const [tab, setTab] = useState("observacoes");

  if (!mae) return null;

  return (
    <>
      <ResponsiveOverlay
        open={open}
        onOpenChange={onOpenChange}
        title={mae.nome_mae}
        description={`CPF ${formatCpf(mae.cpf)} · ${mae.status_processo}`}
        desktopWidth="sm:max-w-[1100px] w-[95vw]"
        mobileSide="right"
        className="md:h-[90vh]"
      >
        <div className="space-y-4">
          {/* Header card: identidade + ações */}
          <div className="rounded-xl border bg-card p-4 flex flex-wrap items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold truncate">{mae.nome_mae}</h2>
                <Badge
                  className={cn("text-xs", STATUS_COLORS[mae.status_processo])}
                  variant="outline"
                >
                  {mae.status_processo}
                </Badge>
                {mae.contrato_assinado && (
                  <Badge variant="secondary">Contrato Assinado</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
                <span className="font-mono">CPF: {formatCpf(mae.cpf)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(mae.cpf, "CPF")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                {mae.telefone && (
                  <>
                    <span className="text-border">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {mae.telefone}
                    </span>
                  </>
                )}
                {mae.uf && (
                  <>
                    <span className="text-border">·</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {mae.uf}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDocumentosDialogOpen(true)}
                className="gap-1.5"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                Documentos
              </Button>
            </div>
          </div>

          {/* Senha gov destaque */}
          {mae.senha_gov && <SenhaGovCard senha={mae.senha_gov} />}

          {/* Tabs principais */}
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="observacoes" className="gap-1.5">
                <MessageSquare className="h-4 w-4" />
                Observações & Histórico
              </TabsTrigger>
              <TabsTrigger value="info" className="gap-1.5">
                <Info className="h-4 w-4" />
                Informações
              </TabsTrigger>
            </TabsList>

            <TabsContent value="observacoes" className="mt-4">
              <ObservacoesHistorico maeId={mae.id} />
            </TabsContent>

            <TabsContent value="info" className="mt-4 space-y-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <InfoItem icon={ClipboardList} label="Tipo de Evento" value={mae.tipo_evento} />
                <InfoItem
                  icon={Calendar}
                  label={mae.data_evento_tipo || "Data do Evento"}
                  value={mae.data_evento ? formatDate(mae.data_evento) : "Não informado"}
                />
                <InfoItem icon={User} label="Categoria Previdenciária" value={mae.categoria_previdenciaria} />
                <InfoItem icon={MapPin} label="UF" value={mae.uf || "Não informado"} />
                {mae.telefone && (
                  <InfoItemWithCopy icon={Phone} label="Telefone" value={mae.telefone} onCopy={() => copyToClipboard(mae.telefone!, "Telefone")} />
                )}
                {mae.email && (
                  <InfoItemWithCopy icon={Mail} label="Email" value={mae.email} onCopy={() => copyToClipboard(mae.email!, "Email")} />
                )}
                <InfoItem icon={ShieldCheck} label="Verificação 2 Etapas" value={mae.verificacao_duas_etapas ? "Sim" : "Não"} />
              </div>

              {mae.protocolo_inss && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Protocolo INSS
                    </h4>
                    <p className="text-sm font-mono bg-muted p-2 rounded">{mae.protocolo_inss}</p>
                  </div>
                </>
              )}

              {mae.parcelas && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Parcelas</h4>
                  <p className="text-sm">{mae.parcelas}</p>
                </div>
              )}

              {(mae.segurada || mae.precisa_gps) && (
                <>
                  <Separator />
                  <div className="grid gap-4 md:grid-cols-2">
                    {mae.segurada && (
                      <div>
                        <span className="text-sm text-muted-foreground">Segurada:</span>
                        <p className="font-medium">{mae.segurada}</p>
                      </div>
                    )}
                    {mae.precisa_gps && (
                      <div>
                        <span className="text-sm text-muted-foreground">Precisa GPS:</span>
                        <p className="font-medium">{mae.precisa_gps}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              <Separator />
              <div className="flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
                <span>Origem: {mae.origem || "Não informado"}</span>
                <span>Última atualização: {formatDate(mae.data_ultima_atualizacao)}</span>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ResponsiveOverlay>

      <DocumentosDialog
        open={documentosDialogOpen}
        onOpenChange={setDocumentosDialogOpen}
        maeId={mae.id}
        maeNome={mae.nome_mae}
        linkDocumentos={mae.link_documentos || null}
        onSuccess={() => {}}
      />
    </>
  );
}

interface InfoItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function InfoItem({ icon: Icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card/50 p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-sm break-words">{value}</p>
      </div>
    </div>
  );
}

interface InfoItemWithCopyProps extends InfoItemProps {
  onCopy: () => void;
}

function InfoItemWithCopy({ icon: Icon, label, value, onCopy }: InfoItemWithCopyProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card/50 p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{value}</p>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={onCopy}>
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

  const handleReveal = useCallback(() => setRevealed(true), []);

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
    <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Key className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-primary">Senha gov.br</span>
        {revealed && (
          <Badge variant="secondary" className="text-[10px] ml-auto animate-pulse">
            Visível por 10s
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-lg font-mono font-semibold tracking-wider flex-1 select-none min-w-0">
          {revealed ? senha : partial}
        </p>
        <Button size="sm" onClick={handleCopy} className="gap-1.5 shrink-0">
          <Copy className="h-4 w-4" />
          Copiar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => (revealed ? setRevealed(false) : handleReveal())}
          className="gap-1.5 shrink-0"
        >
          {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {revealed ? "Ocultar" : "Revelar"}
        </Button>
      </div>
    </div>
  );
}
