import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          fullscreenOnMobile={false}
          className={cn(
            "p-0 gap-0 flex flex-col overflow-hidden bg-background",
            // Mobile: fullscreen
            "inset-0 top-0 left-0 translate-x-0 translate-y-0 w-screen h-[100dvh] max-w-none rounded-none",
            // Desktop: large centered panel — override md:max-w-lg from base
            "md:inset-[2.5vh_2.5vw] md:top-[2.5vh] md:left-[2.5vw] md:w-[95vw] md:h-[95vh] md:max-w-[1400px] md:max-h-[95vh] md:rounded-xl md:translate-x-0 md:translate-y-0"
          )}
        >
          <VisuallyHidden>
            <DialogTitle>{mae.nome_mae}</DialogTitle>
            <DialogDescription>Detalhes da mãe {mae.nome_mae}</DialogDescription>
          </VisuallyHidden>

          {/* Sticky header */}
          <header className="shrink-0 border-b bg-card/50 backdrop-blur px-4 md:px-6 py-3 md:py-4">
            <div className="flex items-start gap-3 md:gap-4 flex-wrap">
              <div className="flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-full bg-primary/10 shrink-0">
                <User className="h-6 w-6 md:h-7 md:w-7 text-primary" />
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg md:text-2xl font-bold truncate max-w-full">
                    {mae.nome_mae}
                  </h2>
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
                <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs md:text-sm text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(mae.cpf, "CPF")}
                    className="inline-flex items-center gap-1 font-mono hover:text-foreground transition-colors"
                  >
                    CPF: {formatCpf(mae.cpf)}
                    <Copy className="h-3 w-3" />
                  </button>
                  {mae.telefone && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(mae.telefone!, "Telefone")}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {mae.telefone}
                    </button>
                  )}
                  {mae.email && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(mae.email!, "Email")}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors truncate max-w-[220px]"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{mae.email}</span>
                    </button>
                  )}
                  {mae.uf && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {mae.uf}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
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
                    <span className="hidden sm:inline">Editar</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDocumentosDialogOpen(true)}
                  className="gap-1.5"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Documentos</span>
                </Button>
              </div>
            </div>
          </header>

          {/* Body: 2 colunas em desktop, stacked no mobile */}
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
            {/* Coluna principal: Observações */}
            <main className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden border-b lg:border-b-0 lg:border-r">
              <Tabs
                value={tab}
                onValueChange={setTab}
                className="flex-1 min-h-0 flex flex-col"
              >
                <div className="px-4 md:px-6 pt-3 md:pt-4 shrink-0">
                  <TabsList className="grid grid-cols-2 w-full max-w-md">
                    <TabsTrigger value="observacoes" className="gap-1.5">
                      <MessageSquare className="h-4 w-4" />
                      <span className="hidden sm:inline">Observações</span>
                      <span className="sm:hidden">Notas</span>
                    </TabsTrigger>
                    <TabsTrigger value="info" className="gap-1.5 lg:hidden">
                      <Info className="h-4 w-4" />
                      Informações
                    </TabsTrigger>
                    <TabsTrigger value="resumo" className="gap-1.5 hidden lg:flex">
                      <Info className="h-4 w-4" />
                      Resumo
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent
                  value="observacoes"
                  className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4 mt-0"
                >
                  <ObservacoesHistorico maeId={mae.id} />
                </TabsContent>

                <TabsContent
                  value="info"
                  className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4 mt-0 lg:hidden"
                >
                  <InformacoesPanel mae={mae} />
                </TabsContent>

                <TabsContent
                  value="resumo"
                  className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4 mt-0 hidden lg:block"
                >
                  <ResumoRapido mae={mae} />
                </TabsContent>
              </Tabs>
            </main>

            {/* Coluna lateral: informações sempre visíveis em desktop */}
            <aside className="hidden lg:flex w-[380px] xl:w-[420px] shrink-0 flex-col overflow-hidden bg-muted/20">
              <div className="px-5 py-3 border-b bg-card/40 shrink-0">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Informações do processo
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <InformacoesPanel mae={mae} />
              </div>
            </aside>
          </div>
        </DialogContent>
      </Dialog>

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

function ResumoRapido({ mae }: { mae: MaeProcesso }) {
  return (
    <div className="space-y-4 max-w-2xl">
      {mae.senha_gov && <SenhaGovCard senha={mae.senha_gov} />}
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <h4 className="text-sm font-semibold">Dicas rápidas</h4>
        <p className="text-xs text-muted-foreground">
          Use a aba <strong>Observações</strong> para registrar todo o histórico de atendimento.
          As informações do processo ficam sempre visíveis no painel à direita.
        </p>
      </div>
    </div>
  );
}

function InformacoesPanel({ mae }: { mae: MaeProcesso }) {
  return (
    <div className="space-y-4">
      {mae.senha_gov && <SenhaGovCard senha={mae.senha_gov} />}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <InfoItem icon={ClipboardList} label="Tipo de Evento" value={mae.tipo_evento} />
        <InfoItem
          icon={Calendar}
          label={mae.data_evento_tipo || "Data do Evento"}
          value={mae.data_evento ? formatDate(mae.data_evento) : "Não informado"}
        />
        <InfoItem icon={User} label="Categoria" value={mae.categoria_previdenciaria} />
        <InfoItem icon={MapPin} label="UF" value={mae.uf || "—"} />
        {mae.telefone && (
          <InfoItemWithCopy
            icon={Phone}
            label="Telefone"
            value={mae.telefone}
            onCopy={() => copyToClipboard(mae.telefone!, "Telefone")}
          />
        )}
        {mae.email && (
          <InfoItemWithCopy
            icon={Mail}
            label="Email"
            value={mae.email}
            onCopy={() => copyToClipboard(mae.email!, "Email")}
          />
        )}
        <InfoItem
          icon={ShieldCheck}
          label="Verif. 2 Etapas"
          value={mae.verificacao_duas_etapas ? "Sim" : "Não"}
        />
      </div>

      {mae.protocolo_inss && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
            <FileText className="h-3.5 w-3.5" />
            Protocolo INSS
          </h4>
          <p className="text-sm font-mono bg-muted p-2 rounded break-all">
            {mae.protocolo_inss}
          </p>
        </div>
      )}

      {mae.parcelas && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Parcelas
          </h4>
          <p className="text-sm">{mae.parcelas}</p>
        </div>
      )}

      {(mae.segurada || mae.precisa_gps) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {mae.segurada && (
            <div>
              <span className="text-xs text-muted-foreground">Segurada:</span>
              <p className="text-sm font-medium">{mae.segurada}</p>
            </div>
          )}
          {mae.precisa_gps && (
            <div>
              <span className="text-xs text-muted-foreground">Precisa GPS:</span>
              <p className="text-sm font-medium">{mae.precisa_gps}</p>
            </div>
          )}
        </div>
      )}

      <Separator />
      <div className="space-y-1 text-xs text-muted-foreground">
        <div>Origem: {mae.origem || "—"}</div>
        <div>Atualizado: {formatDate(mae.data_ultima_atualizacao)}</div>
      </div>
    </div>
  );
}

interface InfoItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function InfoItem({ icon: Icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-start gap-2 rounded-md border bg-card/50 p-2.5">
      <div className="flex h-7 w-7 items-center justify-center rounded bg-muted shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-medium text-sm break-words leading-tight">{value}</p>
      </div>
    </div>
  );
}

interface InfoItemWithCopyProps extends InfoItemProps {
  onCopy: () => void;
}

function InfoItemWithCopy({ icon: Icon, label, value, onCopy }: InfoItemWithCopyProps) {
  return (
    <div className="flex items-start gap-2 rounded-md border bg-card/50 p-2.5">
      <div className="flex h-7 w-7 items-center justify-center rounded bg-muted shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1">
          <p className="font-medium text-sm truncate">{value}</p>
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 shrink-0" onClick={onCopy}>
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
  const partial =
    senha.length >= 4
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
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-base font-mono font-semibold tracking-wider flex-1 select-none min-w-0 break-all">
          {revealed ? senha : partial}
        </p>
        <Button size="sm" onClick={handleCopy} className="gap-1.5 shrink-0 h-8">
          <Copy className="h-3.5 w-3.5" />
          Copiar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => (revealed ? setRevealed(false) : handleReveal())}
          className="gap-1.5 shrink-0 h-8"
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {revealed ? "Ocultar" : "Revelar"}
        </Button>
      </div>
    </div>
  );
}
