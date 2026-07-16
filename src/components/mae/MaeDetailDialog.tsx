import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaeProcesso, STATUS_COLORS } from "@/types/mae";
import { formatCpf, formatDate } from "@/lib/formatters";
import {
  ClipboardList,
  Contact,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  FileWarning,
  FolderOpen,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquareWarning,
  Pencil,
  Phone,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DocumentosContent } from "@/components/mae/DocumentosDialog";
import { ObservacoesHistorico } from "@/components/mae/ObservacoesHistorico";
import { buildEnderecoCompleto } from "@/components/mae/AddressFields";
import { formatarTempo, getAcompanhamentoMae } from "@/lib/maeAcompanhamento";

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
    toast.error(`Não foi possível copiar ${label.toLowerCase()}`);
  }
};

export function MaeDetailDialog({
  mae,
  open,
  onOpenChange,
  onEdit,
}: MaeDetailDialogProps) {
  const [activeTab, setActiveTab] = useState("resumo");
  const [senhaRevelada, setSenhaRevelada] = useState(false);

  useEffect(() => {
    setActiveTab("resumo");
    setSenhaRevelada(false);
  }, [mae?.id, open]);

  useEffect(() => {
    if (!senhaRevelada) return;
    const timer = window.setTimeout(() => setSenhaRevelada(false), 10000);
    return () => window.clearTimeout(timer);
  }, [senhaRevelada]);

  const enderecoCompleto = useMemo(() => {
    if (!mae) return "";
    return buildEnderecoCompleto({
      cep: mae.cep ?? undefined,
      endereco: mae.endereco ?? undefined,
      numero: mae.numero ?? undefined,
      complemento: mae.complemento ?? undefined,
      bairro: mae.bairro ?? undefined,
      cidade: mae.cidade ?? undefined,
      uf: mae.uf,
    });
  }, [mae]);

  if (!mae) return null;

  const acompanhamento = getAcompanhamentoMae(mae);
  const gpsStatus = mae.das_concluido
    ? "Finalizada"
    : mae.precisa_das
      ? "Pendente"
      : mae.precisa_gps || "Não precisa";
  const mapsUrl = enderecoCompleto
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoCompleto)}`
    : "";
  const phoneDigits = mae.telefone?.replace(/\D/g, "") || "";
  const whatsappNumber = phoneDigits && phoneDigits.length <= 11 ? `55${phoneDigits}` : phoneDigits;

  const openWhatsApp = () => {
    if (!whatsappNumber) return;
    window.open(`https://wa.me/${whatsappNumber}`, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] gap-0 overflow-y-auto p-0 sm:max-w-[calc(100vw-2rem)] lg:max-w-2xl">
        <div className="flex min-h-0 flex-col">
          <DialogHeader className="shrink-0 border-b px-4 py-3 pr-12 md:px-5">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
              <div className="min-w-0">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="pr-2 text-left text-base leading-snug md:text-lg">
                      {mae.nome_mae}
                    </DialogTitle>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:gap-4">
                      <CredentialItem
                        label="CPF"
                        value={formatCpf(mae.cpf)}
                        onCopy={() => copyToClipboard(mae.cpf, "CPF")}
                      />
                      <div className="min-w-0 text-left">
                        <span className="text-xs text-muted-foreground">Senha Gov.br</span>
                        <div className="mt-0.5 flex min-h-7 items-center gap-1">
                          <span className={cn("truncate font-mono text-sm", !senhaRevelada && "tracking-widest")}>
                            {mae.senha_gov
                              ? senhaRevelada
                                ? mae.senha_gov
                                : "•".repeat(Math.max(8, Math.min(mae.senha_gov.length, 12)))
                              : "Não cadastrada"}
                          </span>
                          {mae.senha_gov && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => setSenhaRevelada((value) => !value)}
                                aria-label={senhaRevelada ? "Ocultar senha Gov.br" : "Revelar senha Gov.br por 10 segundos"}
                              >
                                {senhaRevelada ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => copyToClipboard(mae.senha_gov!, "Senha Gov.br")}
                                aria-label="Copiar senha Gov.br"
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 pl-0 md:pl-14">
                  <Badge
                    variant="outline"
                    className={cn("px-2.5 py-1 text-xs", STATUS_COLORS[mae.status_processo])}
                  >
                    {mae.status_processo}
                  </Badge>
                  {mae.etiqueta && (
                    <Badge variant="outline" className="border-primary/20 bg-primary/5 px-2.5 py-1 text-xs text-foreground">
                      {mae.etiqueta}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 md:justify-end">
                {onEdit && (
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      onOpenChange(false);
                      onEdit(mae);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                )}
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setActiveTab("documentos")}>
                  <FolderOpen className="h-3.5 w-3.5" />
                  Documentos
                </Button>
              </div>
            </div>
            <DialogDescription className="sr-only">
              Dados, histórico e documentos de {mae.nome_mae}.
            </DialogDescription>
          </DialogHeader>

          <div className="min-w-0 px-4 pb-4 md:px-5">
            <div className="my-3 grid divide-y border-y py-2.5 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="pb-3 sm:pb-0 sm:pr-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MessageSquareWarning className="h-3.5 w-3.5 text-primary" />
                  Último contato
                </div>
                <p className="mt-1 text-sm font-medium">
                  {!acompanhamento.aplicavel
                    ? "Não se aplica a esta etapa"
                    : acompanhamento.nuncaContatada
                      ? "Nenhuma anotação"
                      : formatarTempo(acompanhamento.diasSemContato)}
                </p>
                {acompanhamento.aplicavel && (
                  <button
                    type="button"
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    onClick={() => setActiveTab("historico")}
                  >
                    Registrar contato
                  </button>
                )}
              </div>
              <div className="pt-3 sm:pl-4 sm:pt-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileWarning className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" />
                  GPS
                </div>
                <p className="mt-1 text-sm font-medium">{gpsStatus}</p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid h-auto w-full grid-cols-3">
                <TabsTrigger value="resumo" className="text-sm">Resumo</TabsTrigger>
                <TabsTrigger value="historico" className="text-sm">Histórico</TabsTrigger>
                <TabsTrigger value="documentos" className="text-sm">Documentos</TabsTrigger>
              </TabsList>

              <TabsContent value="resumo" className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <DetailSection icon={ClipboardList} title="Processo">
                    <DetailField label="Tipo de evento" value={mae.tipo_evento} />
                    <DetailField
                      label={mae.data_evento_tipo || "Data do evento"}
                      value={mae.data_evento ? formatDate(mae.data_evento) : "Não informado"}
                    />
                    <DetailField label="Categoria" value={mae.categoria_previdenciaria} />
                    {mae.segurada && <DetailField label="Segurada" value={mae.segurada} />}
                    <DetailField label="Contrato" value={mae.contrato_assinado ? "Assinado" : "Não assinado"} />
                  </DetailSection>

                  <DetailSection icon={Contact} title="Contato">
                    {mae.telefone && <DetailField label="Telefone" value={mae.telefone} />}
                    {mae.email && <DetailField label="E-mail" value={mae.email} />}
                    {mae.uf && <DetailField label="UF" value={mae.uf} />}
                    <DetailField
                      label="Verificação 2 etapas"
                      value={mae.verificacao_duas_etapas ? "Sim" : "Não"}
                    />
                    {(mae.telefone || mae.email) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {mae.telefone && (
                          <>
                            <Button variant="outline" size="sm" className="gap-2" onClick={openWhatsApp}>
                              <MessageCircle className="h-3.5 w-3.5" />
                              WhatsApp
                            </Button>
                            <Button variant="ghost" size="sm" className="gap-2" onClick={() => copyToClipboard(mae.telefone!, "Telefone")}>
                              <Phone className="h-3.5 w-3.5" />
                              Copiar telefone
                            </Button>
                          </>
                        )}
                        {mae.email && (
                          <Button variant="ghost" size="sm" className="gap-2" onClick={() => copyToClipboard(mae.email!, "E-mail")}>
                            <Mail className="h-3.5 w-3.5" />
                            Copiar e-mail
                          </Button>
                        )}
                      </div>
                    )}
                  </DetailSection>
                </div>

                {(mae.protocolo_inss || mae.parcelas) && (
                  <DetailSection icon={FileText} title="INSS">
                    {mae.protocolo_inss && <DetailField label="Protocolo" value={mae.protocolo_inss} mono />}
                    {mae.parcelas && <DetailField label="Parcelas" value={mae.parcelas} />}
                  </DetailSection>
                )}

                {enderecoCompleto && (
                  <DetailSection
                    icon={MapPin}
                    title="Endereço"
                    actions={
                      <>
                        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => copyToClipboard(enderecoCompleto, "Endereço")}>
                          <Copy className="h-3.5 w-3.5" />
                          Copiar
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1.5" asChild>
                          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Mapa
                          </a>
                        </Button>
                      </>
                    }
                  >
                    <p className="text-sm leading-relaxed text-muted-foreground">{enderecoCompleto}</p>
                  </DetailSection>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
                  <span>Origem: {mae.origem || "Não informado"}</span>
                  <span>Última atualização: {formatDate(mae.data_ultima_atualizacao)}</span>
                </div>
              </TabsContent>

              <TabsContent value="historico" className="mt-5">
                <ObservacoesHistorico maeId={mae.id} />
              </TabsContent>

              <TabsContent value="documentos" className="mt-5">
                <DocumentosContent
                  maeId={mae.id}
                  linkDocumentos={mae.link_documentos || null}
                  onSuccess={() => undefined}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CredentialItemProps {
  label: string;
  value: string;
  onCopy: () => void;
}

function CredentialItem({ label, value, onCopy }: CredentialItemProps) {
  return (
    <div className="min-w-0 text-left">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-0.5 flex min-h-7 items-center gap-1">
        <span className="truncate font-mono text-sm">{value}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onCopy} aria-label={`Copiar ${label}`}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

interface DetailSectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

function DetailSection({ icon: Icon, title, actions, children }: DetailSectionProps) {
  return (
    <section className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-3 border-b pb-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </h4>
        {actions && <div className="flex flex-wrap items-center justify-end gap-1">{actions}</div>}
      </div>
      <div>{children}</div>
    </section>
  );
}

interface DetailFieldProps {
  label: string;
  value: string;
  mono?: boolean;
}

function DetailField({ label, value, mono = false }: DetailFieldProps) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(88px,0.8fr)_minmax(0,1.2fr)] gap-3 border-b py-1.5 text-sm last:border-b-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn("min-w-0 truncate font-medium", mono && "font-mono text-xs")}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
