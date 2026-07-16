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
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { MaeProcesso, STATUS_COLORS } from "@/types/mae";
import { formatCpf, formatDate } from "@/lib/formatters";
import {
  ClipboardList,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FolderOpen,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Phone,
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



  const ultimoContatoLabel = !acompanhamento.aplicavel
    ? "Não se aplica"
    : acompanhamento.nuncaContatada
      ? "Nenhuma anotação"
      : formatarTempo(acompanhamento.diasSemContato);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1rem)] gap-0 overflow-hidden border-border/60 bg-card p-0 shadow-2xl sm:max-w-lg lg:max-w-2xl">
        <div className="flex max-h-[92dvh] min-h-0 flex-col overflow-hidden">
          {/* ===== HEADER ===== */}
          <DialogHeader className="shrink-0 space-y-0 border-b border-border/60 bg-gradient-to-b from-muted/40 to-transparent px-5 py-5 pr-12 text-left md:px-6">

            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-lg font-semibold leading-tight md:text-xl">
                    {mae.nome_mae}
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      "px-2 py-0 text-[10px] font-bold uppercase tracking-wider",
                      STATUS_COLORS[mae.status_processo],
                    )}
                  >
                    {mae.status_processo}
                  </Badge>
                  {mae.etiqueta && (
                    <Badge variant="outline" className="border-primary/30 bg-primary/10 px-2 py-0 text-[10px] font-bold uppercase tracking-wider text-primary">
                      {mae.etiqueta}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="uppercase tracking-widest text-muted-foreground/70">CPF</span>
                    <span className="text-foreground/80">{formatCpf(mae.cpf)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0 text-muted-foreground hover:text-primary"
                      onClick={() => copyToClipboard(mae.cpf, "CPF")}
                      aria-label="Copiar CPF"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="uppercase tracking-widest text-muted-foreground/70">Gov.br</span>
                    {mae.senha_gov ? (
                      <>
                        <span className={cn("text-foreground/80", !senhaRevelada && "tracking-widest")}>
                          {senhaRevelada ? mae.senha_gov : "•".repeat(Math.max(8, Math.min(mae.senha_gov.length, 12)))}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0 text-muted-foreground hover:text-primary"
                          onClick={() => setSenhaRevelada((v) => !v)}
                          aria-label={senhaRevelada ? "Ocultar senha" : "Revelar senha por 10s"}
                        >
                          {senhaRevelada ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0 text-muted-foreground hover:text-primary"
                          onClick={() => copyToClipboard(mae.senha_gov!, "Senha Gov.br")}
                          aria-label="Copiar senha"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <span className="italic text-muted-foreground">não cadastrada</span>
                    )}
                  </div>
                </div>
              </div>

              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-border/60"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit(mae);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Button>
              )}
            </div>

            {/* ===== KPI GRID ===== */}
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <KpiCard
                label="Último contato"
                value={ultimoContatoLabel}
                tone={
                  !acompanhamento.aplicavel
                    ? "muted"
                    : acompanhamento.contatoAtrasado
                      ? "danger"
                      : acompanhamento.nuncaContatada
                        ? "warning"
                        : "ok"
                }
              />
              <KpiCard
                label="GPS"
                value={gpsStatus}
                tone={mae.das_concluido ? "ok" : mae.precisa_das ? "warning" : "muted"}
              />
              <KpiCard
                label="Etapa atual"
                value={mae.status_processo}
                tone="primary"
                truncate
              />
            </div>
            <DialogDescription className="sr-only">
              Dados, histórico e documentos de {mae.nome_mae}.
            </DialogDescription>
          </DialogHeader>

          {/* ===== ACTION TOOLBAR ===== */}
          <div className="shrink-0 flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/20 px-5 py-3 md:px-6">
            <Button
              size="sm"
              className="flex-1 gap-1.5 sm:flex-none"
              onClick={() => setActiveTab("historico")}
            >
              <Plus className="h-3.5 w-3.5" />
              Registrar contato
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5 border-border/60 sm:flex-none"
              onClick={() => setActiveTab("documentos")}
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Documentos
            </Button>
            {activeTab !== "resumo" && (
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-muted-foreground"
                onClick={() => setActiveTab("resumo")}
              >
                ← Voltar ao resumo
              </Button>
            )}
          </div>

          {/* ===== TABS CONTENT ===== */}
          <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-5 md:px-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="resumo" className="mt-5 space-y-5">
                <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
                  <Section title="Dados do processo">
                    <Field label="Tipo de evento" value={mae.tipo_evento} />
                    <Field
                      label={mae.data_evento_tipo || "Data do evento"}
                      value={mae.data_evento ? formatDate(mae.data_evento) : "Não informado"}
                    />
                    <Field label="Categoria" value={mae.categoria_previdenciaria} />
                    {mae.segurada && <Field label="Segurada" value={mae.segurada} />}
                    <Field label="Contrato" value={mae.contrato_assinado ? "Assinado" : "Não assinado"} />
                    {mae.protocolo_inss && <Field label="Protocolo INSS" value={mae.protocolo_inss} mono />}
                    {mae.parcelas && <Field label="Parcelas" value={mae.parcelas} />}
                  </Section>

                  <Section title="Contato e ações">
                    {mae.telefone && <Field label="Telefone" value={mae.telefone} mono />}
                    {mae.email && <Field label="E-mail" value={mae.email} />}
                    {mae.uf && <Field label="UF" value={mae.uf} />}
                    <Field
                      label="Verificação 2 etapas"
                      value={mae.verificacao_duas_etapas ? "Sim" : "Não"}
                    />
                    {(mae.telefone || mae.email) && (
                      <div className="flex flex-wrap gap-1.5 pt-1.5">
                        {mae.telefone && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-primary"
                            onClick={() => copyToClipboard(mae.telefone!, "Telefone")}
                          >
                            <Phone className="h-3 w-3" />
                            Copiar telefone
                          </Button>
                        )}
                        {mae.email && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-primary"
                            onClick={() => copyToClipboard(mae.email!, "E-mail")}
                          >
                            <Mail className="h-3 w-3" />
                            Copiar e-mail
                          </Button>
                        )}
                      </div>
                    )}
                  </Section>
                </div>

                {enderecoCompleto && (
                  <Section
                    title="Localização"
                    actions={
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-primary"
                          onClick={() => copyToClipboard(enderecoCompleto, "Endereço")}
                        >
                          <Copy className="h-3 w-3" />
                          Copiar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-primary"
                          asChild
                        >
                          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                            Mapa
                          </a>
                        </Button>
                      </div>
                    }
                  >
                    <div className="relative overflow-hidden rounded-lg border border-border/60 bg-muted/30 p-4">
                      <MapPin className="absolute right-3 top-3 h-16 w-16 -rotate-6 text-primary/10" />
                      <p className="relative text-sm leading-relaxed text-foreground/80">
                        {enderecoCompleto}
                      </p>
                    </div>
                  </Section>
                )}
              </TabsContent>

              <TabsContent value="historico" className="mt-5">
                <ObservacoesHistorico maeId={mae.id} startOpen />
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

          {/* ===== FOOTER ===== */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/20 px-5 py-3 md:px-6">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">
                Origem
              </span>
              <span className="text-xs font-medium text-foreground/80">
                {mae.origem || "Não informado"}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">
                Última atualização
              </span>
              <span className="text-xs font-medium text-foreground/80">
                {formatDate(mae.data_ultima_atualizacao)}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Sub-componentes
// ============================================================================

type KpiTone = "muted" | "ok" | "warning" | "danger" | "primary";

function KpiCard({
  label,
  value,
  tone = "muted",
  truncate = false,
}: {
  label: string;
  value: string;
  tone?: KpiTone;
  truncate?: boolean;
}) {
  const TONE: Record<KpiTone, { border: string; text: string; dot: string }> = {
    muted: { border: "border-border/60", text: "text-foreground", dot: "bg-muted-foreground/40" },
    ok: { border: "border-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
    warning: { border: "border-amber-500/30", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
    danger: { border: "border-rose-500/30", text: "text-rose-600 dark:text-rose-400", dot: "bg-rose-500 animate-pulse" },
    primary: { border: "border-primary/30", text: "text-primary", dot: "bg-primary" },
  };
  const t = TONE[tone];

  return (
    <div
      className={cn(
        "group rounded-lg border bg-background/50 p-3 transition-colors hover:border-primary/40",
        t.border,
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} />
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80">
          {label}
        </span>
      </div>
      <p
        className={cn(
          "mt-1 text-sm font-semibold leading-tight",
          t.text,
          truncate && "truncate",
        )}
        title={truncate ? value : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
          {title}
        </h3>
        {actions}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
      <span
        className={cn("truncate text-sm font-medium text-foreground/90", mono && "font-mono text-xs")}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
