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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, Plus, X } from "lucide-react";
import { usePreAnalise } from "@/hooks/usePreAnalise";
import {
  CATEGORIA_SEGURADA_OPTIONS,
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

export function PreAnaliseFormDialog({
  open,
  onOpenChange,
  mae,
  isReanalise = false,
  onSuccess,
}: PreAnaliseFormDialogProps) {
  const { isLoading, executarAnalise } = usePreAnalise();
  
  const [formData, setFormData] = useState<DadosEntradaAnalise>({
    categoria_segurada: "",
    data_evento: "",
    tipo_evento: mae.tipo_evento || "Parto",
    data_ultima_contribuicao: "",
    quantidade_contribuicoes: undefined,
    vinculos_ativos: [],
    vinculos_inativos: [],
    gaps_contribuicao: [],
    documentos_anexados: [],
    observacoes_adicionais: "",
    dados_cnis: "",
  });

  const [motivoReanalise, setMotivoReanalise] = useState<MotivoReanalise>("documento_novo");
  const [observacaoReanalise, setObservacaoReanalise] = useState("");
  const [novoVinculo, setNovoVinculo] = useState("");
  const [novoDocumento, setNovoDocumento] = useState("");

  // Mapear categoria do mae_processo para o enum
  const mapCategoria = (cat: string): string => {
    const map: Record<string, string> = {
      "CLT": "empregada_clt",
      "MEI": "mei",
      "Contribuinte Individual": "contribuinte_individual",
      "Desempregada": "desempregada",
    };
    return map[cat] || "";
  };

  useEffect(() => {
    if (mae) {
      setFormData(prev => ({
        ...prev,
        categoria_segurada: mapCategoria(mae.categoria_previdenciaria),
        data_evento: mae.data_evento || "",
        tipo_evento: mae.tipo_evento || "Parto",
      }));
    }
  }, [mae]);

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

  const addVinculo = (tipo: "ativos" | "inativos") => {
    if (!novoVinculo.trim()) return;
    const key = tipo === "ativos" ? "vinculos_ativos" : "vinculos_inativos";
    setFormData(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), novoVinculo.trim()],
    }));
    setNovoVinculo("");
  };

  const removeVinculo = (tipo: "ativos" | "inativos", index: number) => {
    const key = tipo === "ativos" ? "vinculos_ativos" : "vinculos_inativos";
    setFormData(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter((_, i) => i !== index),
    }));
  };

  const addDocumento = () => {
    if (!novoDocumento.trim()) return;
    setFormData(prev => ({
      ...prev,
      documentos_anexados: [...(prev.documentos_anexados || []), novoDocumento.trim()],
    }));
    setNovoDocumento("");
  };

  const removeDocumento = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documentos_anexados: (prev.documentos_anexados || []).filter((_, i) => i !== index),
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
                  value={formData.categoria_segurada}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, categoria_segurada: v }))}
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
                  value={formData.tipo_evento}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, tipo_evento: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Parto">Parto</SelectItem>
                    <SelectItem value="Adoção">Adoção</SelectItem>
                    <SelectItem value="Guarda judicial">Guarda Judicial</SelectItem>
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
                <Label>Data da Última Contribuição</Label>
                <Input
                  type="date"
                  value={formData.data_ultima_contribuicao || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_ultima_contribuicao: e.target.value }))}
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Quantidade de Contribuições</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Ex: 12"
                  value={formData.quantidade_contribuicoes || ""}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    quantidade_contribuicoes: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                />
              </div>
            </div>
          </div>

          {/* Vínculos */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase">
              Vínculos Empregatícios
            </h3>
            
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Empresa ABC - 01/2020 a 12/2023"
                value={novoVinculo}
                onChange={(e) => setNovoVinculo(e.target.value)}
              />
              <Button type="button" variant="outline" size="icon" onClick={() => addVinculo("ativos")}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {(formData.vinculos_ativos?.length ?? 0) > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Vínculos Ativos:</Label>
                <div className="flex flex-wrap gap-2">
                  {formData.vinculos_ativos?.map((v, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {v}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeVinculo("ativos", i)} />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {(formData.vinculos_inativos?.length ?? 0) > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Vínculos Inativos:</Label>
                <div className="flex flex-wrap gap-2">
                  {formData.vinculos_inativos?.map((v, i) => (
                    <Badge key={i} variant="outline" className="gap-1">
                      {v}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeVinculo("inativos", i)} />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Documentos */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground uppercase">
              Documentos Anexados
            </h3>
            
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Certidão de Nascimento"
                value={novoDocumento}
                onChange={(e) => setNovoDocumento(e.target.value)}
              />
              <Button type="button" variant="outline" size="icon" onClick={addDocumento}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {(formData.documentos_anexados?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.documentos_anexados?.map((d, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {d}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeDocumento(i)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* CNIS */}
          <div className="space-y-2">
            <Label>Dados do CNIS (copiar e colar)</Label>
            <Textarea
              placeholder="Cole aqui os dados do CNIS da segurada..."
              rows={6}
              value={formData.dados_cnis || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, dados_cnis: e.target.value }))}
            />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações Adicionais</Label>
            <Textarea
              placeholder="Informações adicionais relevantes para a análise..."
              value={formData.observacoes_adicionais || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes_adicionais: e.target.value }))}
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
            <Button type="submit" disabled={isLoading || !formData.categoria_segurada || !formData.data_evento}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Executar Análise
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
