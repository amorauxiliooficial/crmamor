import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useBancos } from "@/hooks/useBancos";
import { useTemplates } from "@/hooks/useTemplates";
import { useAtendentesComunicado } from "@/hooks/useAtendentesComunicado";
import { useCentralFinanceira } from "@/hooks/useCentralFinanceira";
import { Loader2, Copy, Check, FileText, Building2, UserCircle2, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PagamentoComMae } from "@/hooks/usePagamentos";

interface ComunicadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagamento: PagamentoComMae;
  maeCep?: string;
}

const formatCpf = (cpf: string) => {
  const cleaned = cpf.replace(/\D/g, "").padStart(11, "0");
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "(Data a confirmar)";
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
};

const getSaudacao = () => {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
};

const getPrimeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;

export function ComunicadoDialog({
  open,
  onOpenChange,
  pagamento,
  maeCep,
}: ComunicadoDialogProps) {
  const { toast } = useToast();
  const { bancos, isLoading: bancosLoading } = useBancos();
  const { templates, isLoading: templatesLoading } = useTemplates();
  const { atendentes, isLoading: atendentesLoading } = useAtendentesComunicado();
  const central = useCentralFinanceira(pagamento.mae_id);

  const [selectedBancoId, setSelectedBancoId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedAtendenteId, setSelectedAtendenteId] = useState<string>("");
  const [selectedParcelaIndex, setSelectedParcelaIndex] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  // Auto-select first template / active atendente when data loads
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) setSelectedTemplateId(templates[0].id);
  }, [templates, selectedTemplateId]);

  useEffect(() => {
    const ativos = atendentes.filter((a) => a.ativo);
    if (ativos.length > 0 && !selectedAtendenteId) setSelectedAtendenteId(ativos[0].id);
  }, [atendentes, selectedAtendenteId]);

  const selectedBanco = bancos.find((b) => b.id === selectedBancoId);
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const selectedAtendente = atendentes.find((a) => a.id === selectedAtendenteId);

  const centralData = central.centralQuery?.data;
  const parcelasBeneficio = central.parcelasQuery?.data ?? [];
  const boletosAmor = central.boletosQuery?.data ?? [];

  const generatedText = useMemo(() => {
    if (!selectedTemplate) return "";
    const parcela = pagamento.parcelas[selectedParcelaIndex];

    // Nome banco / endereço - prioridade: central_financeira > seleção manual
    const bancoNome =
      centralData?.banco_saque?.trim() ||
      selectedBanco?.nome ||
      "[Banco não informado]";
    const bancoEndereco =
      centralData?.endereco_saque?.trim() ||
      (selectedBanco
        ? `${selectedBanco.endereco}${selectedBanco.cidade ? `, ${selectedBanco.cidade}` : ""}${selectedBanco.uf ? `/${selectedBanco.uf}` : ""}`
        : "[Endereço não informado]");

    // Data / hora saque - prioridade: central > parcela do pagamento
    const dataSaque = centralData?.data_saque
      ? formatDate(centralData.data_saque)
      : formatDate(parcela?.data_pagamento ?? null);
    const horaSaque = centralData?.horario_saque?.trim() || "(Horário a confirmar)";

    // Lista de parcelas do benefício
    const listaParcelas = parcelasBeneficio.length
      ? parcelasBeneficio
          .sort((a, b) => a.numero_parcela - b.numero_parcela)
          .map(
            (p) =>
              `${p.numero_parcela}ª parcela – ${formatCurrency(p.valor)} – ${formatDate(p.data_parcela)}`
          )
          .join("\n")
      : "(Nenhuma parcela cadastrada na Central Financeira)";

    // Lista de boletos da Amor
    const listaBoletos = boletosAmor.length
      ? boletosAmor
          .map((b, i) => {
            const ordinal = `${i + 1}º`;
            return `${ordinal} boleto – ${formatCurrency(b.valor)} – vencimento ${formatDate(b.vencimento)}`;
          })
          .join("\n")
      : "(Nenhum boleto cadastrado na Central Financeira)";

    // Totais
    const valorTotalBeneficio =
      parcelasBeneficio.reduce((s, p) => s + Number(p.valor ?? 0), 0) ||
      Number(centralData?.valor_previsto_beneficio ?? 0);

    const totalHonorarios = boletosAmor.reduce((s, b) => s + Number(b.valor ?? 0), 0);
    const taxaAdm = Number(centralData?.taxa_administrativa ?? 0);
    const percentualHonorarios = centralData?.percentual_honorarios ?? null;

    const replacements: Record<string, string> = {
      "{{SAUDACAO}}": getSaudacao(),
      "{{NOME_MAE}}": pagamento.mae_nome,
      "{{PRIMEIRO_NOME_MAE}}": getPrimeiroNome(pagamento.mae_nome),
      "{{CPF}}": formatCpf(pagamento.mae_cpf),
      "{{CEP}}": maeCep || "[CEP não informado]",
      "{{NOME_ATENDENTE}}": selectedAtendente?.nome || "[Selecione um atendente]",
      "{{CARGO_ATENDENTE}}": selectedAtendente?.cargo || "",
      "{{NUMERO_BENEFICIO}}": centralData?.numero_beneficio || "[Nº do benefício não informado]",
      "{{BANCO_NOME}}": bancoNome,
      "{{BANCO_ENDERECO}}": bancoEndereco,
      "{{DATA_SAQUE}}": dataSaque,
      "{{HORA_SAQUE}}": horaSaque,
      "{{VALOR_TOTAL_BENEFICIO}}": formatCurrency(valorTotalBeneficio),
      "{{LISTA_PARCELAS_BENEFICIO}}": listaParcelas,
      "{{LISTA_BOLETOS_AMOR}}": listaBoletos,
      "{{HONORARIOS}}": formatCurrency(totalHonorarios),
      "{{PERCENTUAL_HONORARIOS}}": percentualHonorarios != null ? `${percentualHonorarios}%` : "",
      "{{TAXA_ADMINISTRATIVA}}": taxaAdm > 0 ? formatCurrency(taxaAdm) : "ISENTO",
      "{{TOTAL_HONORARIOS}}": formatCurrency(totalHonorarios + taxaAdm),
      // Retrocompatibilidade com templates antigos
      "{{VALOR_PARCELA}}": formatCurrency(parcela?.valor ?? null),
      "{{DATA_PAGAMENTO}}": formatDate(parcela?.data_pagamento ?? null),
      "{{NUMERO_PARCELA}}": String(parcela?.numero_parcela ?? ""),
      "{{TOTAL_PARCELAS}}": String(pagamento.total_parcelas),
    };

    let text = selectedTemplate.conteudo;
    Object.entries(replacements).forEach(([key, value]) => {
      text = text.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
    });
    return text;
  }, [
    selectedTemplate,
    selectedBanco,
    selectedAtendente,
    pagamento,
    selectedParcelaIndex,
    maeCep,
    centralData,
    parcelasBeneficio,
    boletosAmor,
  ]);

  const handleCopy = async () => {
    if (!generatedText) return;
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      toast({ title: "Texto copiado para a área de transferência" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ variant: "destructive", title: "Erro ao copiar" });
    }
  };

  const isLoading =
    bancosLoading ||
    templatesLoading ||
    atendentesLoading ||
    central.centralQuery?.isLoading ||
    central.parcelasQuery?.isLoading ||
    central.boletosQuery?.isLoading;

  const variaveis = [
    "{{SAUDACAO}}",
    "{{NOME_MAE}}",
    "{{PRIMEIRO_NOME_MAE}}",
    "{{CPF}}",
    "{{CEP}}",
    "{{NOME_ATENDENTE}}",
    "{{CARGO_ATENDENTE}}",
    "{{NUMERO_BENEFICIO}}",
    "{{BANCO_NOME}}",
    "{{BANCO_ENDERECO}}",
    "{{DATA_SAQUE}}",
    "{{HORA_SAQUE}}",
    "{{VALOR_TOTAL_BENEFICIO}}",
    "{{LISTA_PARCELAS_BENEFICIO}}",
    "{{LISTA_BOLETOS_AMOR}}",
    "{{HONORARIOS}}",
    "{{PERCENTUAL_HONORARIOS}}",
    "{{TAXA_ADMINISTRATIVA}}",
    "{{TOTAL_HONORARIOS}}",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Comunicado - {pagamento.mae_nome}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Seleções principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um template" /></SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <UserCircle2 className="h-3.5 w-3.5" />
                  Atendente que está enviando
                </Label>
                <Select value={selectedAtendenteId} onValueChange={setSelectedAtendenteId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um atendente" /></SelectTrigger>
                  <SelectContent>
                    {atendentes.filter((a) => a.ativo).length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Nenhum atendente cadastrado
                      </div>
                    ) : (
                      atendentes
                        .filter((a) => a.ativo)
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.nome}{a.cargo ? ` — ${a.cargo}` : ""}
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  Banco (fallback)
                </Label>
                <Select value={selectedBancoId} onValueChange={setSelectedBancoId}>
                  <SelectTrigger><SelectValue placeholder="Usar banco da Central Financeira" /></SelectTrigger>
                  <SelectContent>
                    {bancos.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">Nenhum banco cadastrado</div>
                    ) : (
                      bancos.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {pagamento.parcelas.length > 1 && (
                <div className="space-y-2">
                  <Label>Parcela (retrocompat.)</Label>
                  <Select
                    value={String(selectedParcelaIndex)}
                    onValueChange={(v) => setSelectedParcelaIndex(Number(v))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {pagamento.parcelas.map((p, i) => (
                        <SelectItem key={p.id} value={String(i)}>
                          {p.numero_parcela}ª - {formatCurrency(p.valor)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Aviso sobre origem dos dados */}
            <Card className="bg-muted/40 border-dashed">
              <CardContent className="p-3 flex gap-2 text-xs">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                <div className="text-muted-foreground">
                  Dados de <strong>banco de saque, número do benefício, parcelas e boletos</strong> vêm
                  automaticamente da <strong>Central Financeira</strong> desta cliente. Para alterar,
                  edite a Central Financeira dela.
                </div>
              </CardContent>
            </Card>

            {/* Dados para NF */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-2 text-sm">Dados para Nota Fiscal</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Nome:</span><p className="font-medium">{pagamento.mae_nome}</p></div>
                  <div><span className="text-muted-foreground">CPF:</span><p className="font-mono">{formatCpf(pagamento.mae_cpf)}</p></div>
                  <div><span className="text-muted-foreground">CEP:</span><p className="font-mono">{maeCep || "Não informado"}</p></div>
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Prévia do Comunicado</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  disabled={!generatedText || !selectedTemplateId}
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-1 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  Copiar
                </Button>
              </div>
              <Textarea
                value={generatedText}
                readOnly
                className="min-h-[280px] font-mono text-sm whitespace-pre-wrap"
                placeholder="Selecione um template para gerar o comunicado"
              />
            </div>

            {/* Variáveis disponíveis */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-2 text-sm">Variáveis disponíveis</h4>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {variaveis.map((v) => (
                    <code key={v} className="px-2 py-1 bg-muted rounded">{v}</code>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
