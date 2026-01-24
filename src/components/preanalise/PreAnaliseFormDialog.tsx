import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain } from "lucide-react";
import { usePreAnalise } from "@/hooks/usePreAnalise";
import {
  CATEGORIA_SEGURADA_OPTIONS,
  TIPO_EVENTO_OPTIONS,
  MOTIVO_REANALISE_LABELS,
  type DadosEntradaAnalise,
  type MotivoReanalise,
  type PreAnalise,
} from "@/types/preAnalise";
import type { MaeProcesso } from "@/types/mae";

interface PreAnaliseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mae: MaeProcesso;
  isReanalise?: boolean;
  onSuccess?: (analise: PreAnalise) => void;
}

const getEmptyFormData = (mae: MaeProcesso): DadosEntradaAnalise => ({
  cpf: mae.cpf.replace(/\D/g, ""),
  nome: mae.nome_mae,
  categoria: mapCategoria(mae.categoria_previdenciaria),
  gestante: mae.is_gestante,
  evento: mapEvento(mae.tipo_evento),
  data_evento: mae.data_evento || "",
  ultimo_vinculo_data_fim: "",
  total_contribuicoes: 0,
  teve_120_contribuicoes: false,
  recebeu_seguro_desemprego: false,
  mei_ativo: false,
  competencias_em_atraso: false,
  documentos: {
    cnis: false,
    ctps: false,
    certidao: false,
    comprov_endereco: false,
    outros: [],
  },
  observacoes_atendente: mae.observacoes || "",
});

// Mapear categoria do mae_processo para o enum
const mapCategoria = (cat: string): string => {
  const map: Record<string, string> = {
    "CLT": "empregada",
    "MEI": "mei",
    "Contribuinte Individual": "individual",
    "Desempregada": "desempregada",
    "Não informado": "",
  };
  return map[cat] || "";
};

const mapEvento = (evento: string): string => {
  const map: Record<string, string> = {
    "Parto": "parto",
    "Adoção": "adocao",
    "Guarda judicial": "adocao",
  };
  return map[evento] || "parto";
};

export function PreAnaliseFormDialog({
  open,
  onOpenChange,
  mae,
  isReanalise = false,
  onSuccess,
}: PreAnaliseFormDialogProps) {
  const { isLoading, executarAnalise } = usePreAnalise();
  
  const [formData, setFormData] = useState<DadosEntradaAnalise>(() => getEmptyFormData(mae));
  const [motivoReanalise, setMotivoReanalise] = useState<MotivoReanalise>("documento_novo");
  const [observacaoReanalise, setObservacaoReanalise] = useState("");

  useEffect(() => {
    if (mae && open) {
      setFormData(getEmptyFormData(mae));
    }
  }, [mae, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await executarAnalise(
      mae.id,
      formData,
      isReanalise ? motivoReanalise : undefined,
      isReanalise ? observacaoReanalise : undefined
    );

    if (result) {
      onSuccess?.(result);
      onOpenChange(false);
    }
  };

  const updateDocumento = (key: keyof DadosEntradaAnalise["documentos"], value: boolean) => {
    if (key === "outros") return;
    setFormData(prev => ({
      ...prev,
      documentos: { ...prev.documentos, [key]: value },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            {isReanalise ? "Reanálise de Elegibilidade" : "Pré-Análise de Elegibilidade"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {mae.nome_mae} - CPF: {mae.cpf}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isReanalise && (
            <div className="p-4 rounded-lg bg-muted space-y-3">
              <Label>Motivo da Reanálise</Label>
              <Select
                value={motivoReanalise}
                onValueChange={(v) => setMotivoReanalise(v as MotivoReanalise)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MOTIVO_REANALISE_LABELS)
                    .filter(([key]) => key !== "primeiro_registro")
                    .map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Observações sobre a reanálise..."
                value={observacaoReanalise}
                onChange={(e) => setObservacaoReanalise(e.target.value)}
              />
            </div>
          )}

          {/* Dados da Segurada */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase">
              Dados da Segurada
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria Previdenciária *</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, categoria: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIA_SEGURADA_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Evento *</Label>
                <Select
                  value={formData.evento}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, evento: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_EVENTO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data do Evento *</Label>
                <Input
                  type="date"
                  value={formData.data_evento}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_evento: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Fim do Último Vínculo</Label>
                <Input
                  type="date"
                  value={formData.ultimo_vinculo_data_fim || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, ultimo_vinculo_data_fim: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Total de Contribuições</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Ex: 12"
                  value={formData.total_contribuicoes || ""}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    total_contribuicoes: parseInt(e.target.value) || 0
                  }))}
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <Switch
                  id="gestante"
                  checked={formData.gestante}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, gestante: checked }))}
                />
                <Label htmlFor="gestante">Gestante</Label>
              </div>
            </div>
          </div>

          {/* Situação Contributiva */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase">
              Situação Contributiva
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="teve_120"
                  checked={formData.teve_120_contribuicoes}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, teve_120_contribuicoes: !!checked }))
                  }
                />
                <Label htmlFor="teve_120" className="text-sm">
                  Teve 120+ contribuições (período de graça estendido)
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="seguro_desemprego"
                  checked={formData.recebeu_seguro_desemprego}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, recebeu_seguro_desemprego: !!checked }))
                  }
                />
                <Label htmlFor="seguro_desemprego" className="text-sm">
                  Recebeu Seguro-Desemprego
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="mei_ativo"
                  checked={formData.mei_ativo}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, mei_ativo: !!checked }))
                  }
                />
                <Label htmlFor="mei_ativo" className="text-sm">
                  MEI Ativo
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="competencias_atraso"
                  checked={formData.competencias_em_atraso}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, competencias_em_atraso: !!checked }))
                  }
                />
                <Label htmlFor="competencias_atraso" className="text-sm text-destructive">
                  Competências em Atraso
                </Label>
              </div>
            </div>
          </div>

          {/* Documentos */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase">
              Documentos Anexados
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="doc_cnis"
                  checked={formData.documentos.cnis}
                  onCheckedChange={(checked) => updateDocumento("cnis", !!checked)}
                />
                <Label htmlFor="doc_cnis" className="text-sm">CNIS</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="doc_ctps"
                  checked={formData.documentos.ctps}
                  onCheckedChange={(checked) => updateDocumento("ctps", !!checked)}
                />
                <Label htmlFor="doc_ctps" className="text-sm">CTPS</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="doc_certidao"
                  checked={formData.documentos.certidao}
                  onCheckedChange={(checked) => updateDocumento("certidao", !!checked)}
                />
                <Label htmlFor="doc_certidao" className="text-sm">Certidão (Nascimento/Adoção)</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="doc_comprov"
                  checked={formData.documentos.comprov_endereco}
                  onCheckedChange={(checked) => updateDocumento("comprov_endereco", !!checked)}
                />
                <Label htmlFor="doc_comprov" className="text-sm">Comprovante de Endereço</Label>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações do Atendente</Label>
            <Textarea
              placeholder="Informações adicionais relevantes para a análise..."
              rows={4}
              value={formData.observacoes_atendente || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes_atendente: e.target.value }))}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !formData.categoria || !formData.data_evento}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Gerar Pré-Análise
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
