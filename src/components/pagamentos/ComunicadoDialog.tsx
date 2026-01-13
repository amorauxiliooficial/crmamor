import { useState, useMemo } from "react";
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
import { Loader2, Copy, Check, FileText, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PagamentoComMae } from "@/hooks/usePagamentos";

interface ComunicadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagamento: PagamentoComMae;
  maeCep?: string;
}

export function ComunicadoDialog({
  open,
  onOpenChange,
  pagamento,
  maeCep,
}: ComunicadoDialogProps) {
  const { toast } = useToast();
  const { bancos, isLoading: bancosLoading } = useBancos();
  const { templates, isLoading: templatesLoading } = useTemplates();

  const [selectedBancoId, setSelectedBancoId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedParcelaIndex, setSelectedParcelaIndex] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const selectedBanco = bancos.find((b) => b.id === selectedBancoId);
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const formatCpf = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, "").padStart(11, "0");
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const generatedText = useMemo(() => {
    if (!selectedTemplate) return "";

    const parcela = pagamento.parcelas[selectedParcelaIndex];
    if (!parcela) return "";

    let text = selectedTemplate.conteudo;

    // Replace variables
    const replacements: Record<string, string> = {
      "{{NOME_MAE}}": pagamento.mae_nome,
      "{{CPF}}": formatCpf(pagamento.mae_cpf),
      "{{CEP}}": maeCep || "[CEP não informado]",
      "{{BANCO_NOME}}": selectedBanco?.nome || "[Selecione um banco]",
      "{{BANCO_ENDERECO}}": selectedBanco
        ? `${selectedBanco.endereco}${selectedBanco.cidade ? `, ${selectedBanco.cidade}` : ""}${selectedBanco.uf ? `/${selectedBanco.uf}` : ""}`
        : "[Selecione um banco]",
      "{{VALOR_PARCELA}}": formatCurrency(parcela.valor),
      "{{DATA_PAGAMENTO}}": formatDate(parcela.data_pagamento),
      "{{NUMERO_PARCELA}}": String(parcela.numero_parcela),
      "{{TOTAL_PARCELAS}}": String(pagamento.total_parcelas),
    };

    Object.entries(replacements).forEach(([key, value]) => {
      text = text.replace(new RegExp(key, "g"), value);
    });

    return text;
  }, [selectedTemplate, selectedBanco, pagamento, selectedParcelaIndex, maeCep]);

  const handleCopy = async () => {
    if (!generatedText) return;

    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      toast({ title: "Texto copiado para a área de transferência" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        variant: "destructive",
        title: "Erro ao copiar",
        description: "Não foi possível copiar o texto",
      });
    }
  };

  const isLoading = bancosLoading || templatesLoading;

  // Auto-select first template and banco when loaded
  useState(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id);
    }
  });

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
            {/* Seleções */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  Banco
                </Label>
                <Select value={selectedBancoId} onValueChange={setSelectedBancoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {bancos.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Nenhum banco cadastrado
                      </div>
                    ) : (
                      bancos.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {pagamento.parcelas.length > 1 && (
                <div className="space-y-2">
                  <Label>Parcela</Label>
                  <Select
                    value={String(selectedParcelaIndex)}
                    onValueChange={(v) => setSelectedParcelaIndex(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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

            {/* Dados para NF */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-2 text-sm">Dados para Nota Fiscal</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nome:</span>
                    <p className="font-medium">{pagamento.mae_nome}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CPF:</span>
                    <p className="font-mono">{formatCpf(pagamento.mae_cpf)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CEP:</span>
                    <p className="font-mono">{maeCep || "Não informado"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview do comunicado */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Prévia do Comunicado</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  disabled={!generatedText || !selectedBancoId || !selectedTemplateId}
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
                className="min-h-[200px] font-mono text-sm"
                placeholder="Selecione um template e um banco para gerar o comunicado"
              />
            </div>

            {/* Variáveis disponíveis */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-2 text-sm">Variáveis Disponíveis</h4>
                <div className="flex flex-wrap gap-2 text-xs">
                  {[
                    "{{NOME_MAE}}",
                    "{{CPF}}",
                    "{{CEP}}",
                    "{{BANCO_NOME}}",
                    "{{BANCO_ENDERECO}}",
                    "{{VALOR_PARCELA}}",
                    "{{DATA_PAGAMENTO}}",
                    "{{NUMERO_PARCELA}}",
                    "{{TOTAL_PARCELAS}}",
                  ].map((v) => (
                    <code key={v} className="px-2 py-1 bg-muted rounded">
                      {v}
                    </code>
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
