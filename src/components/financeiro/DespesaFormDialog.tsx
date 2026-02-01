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
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDespesas } from "@/hooks/useDespesas";
import { useFornecedores } from "@/hooks/useFornecedores";
import type { Despesa, CategoriaDespesa, StatusTransacao, TipoRecorrencia } from "@/types/despesa";
import { CATEGORIA_LABELS, STATUS_LABELS, RECORRENCIA_LABELS } from "@/types/despesa";

interface DespesaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  despesa?: Despesa | null;
}

export function DespesaFormDialog({ open, onOpenChange, despesa }: DespesaFormDialogProps) {
  const { user } = useAuth();
  const { createDespesa, updateDespesa } = useDespesas();
  const { fornecedoresAtivos } = useFornecedores();
  
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<CategoriaDespesa>("outros");
  const [valor, setValor] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [dataPagamento, setDataPagamento] = useState("");
  const [status, setStatus] = useState<StatusTransacao>("pendente");
  const [recorrencia, setRecorrencia] = useState<TipoRecorrencia>("unica");
  const [fornecedorId, setFornecedorId] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (open) {
      if (despesa) {
        setDescricao(despesa.descricao);
        setCategoria(despesa.categoria);
        setValor(String(despesa.valor));
        setDataVencimento(despesa.data_vencimento);
        setDataPagamento(despesa.data_pagamento || "");
        setStatus(despesa.status);
        setRecorrencia(despesa.recorrencia);
        // Try to match existing fornecedor by name to id
        const matchedFornecedor = fornecedoresAtivos.find(
          f => f.nome.toLowerCase() === despesa.fornecedor?.toLowerCase()
        );
        setFornecedorId(matchedFornecedor?.id || "");
        setObservacoes(despesa.observacoes || "");
      } else {
        setDescricao("");
        setCategoria("outros");
        setValor("");
        setDataVencimento("");
        setDataPagamento("");
        setStatus("pendente");
        setRecorrencia("unica");
        setFornecedorId("");
        setObservacoes("");
      }
    }
  }, [open, despesa, fornecedoresAtivos]);

  const handleSave = async () => {
    if (!user || !descricao || !valor || !dataVencimento) return;

    // Get fornecedor name from id
    const selectedFornecedor = fornecedoresAtivos.find(f => f.id === fornecedorId);

    const payload = {
      user_id: user.id,
      descricao,
      categoria,
      valor: parseFloat(valor),
      data_vencimento: dataVencimento,
      data_pagamento: dataPagamento || null,
      status,
      recorrencia,
      fornecedor: selectedFornecedor?.nome || null,
      fornecedor_id: fornecedorId || null,
      observacoes: observacoes || null,
    };

    if (despesa) {
      await updateDespesa.mutateAsync({ id: despesa.id, ...payload });
    } else {
      await createDespesa.mutateAsync(payload);
    }

    onOpenChange(false);
  };

  const isLoading = createDespesa.isPending || updateDespesa.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{despesa ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Pagamento advogado"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as CategoriaDespesa)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {Object.entries(CATEGORIA_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Vencimento *</Label>
              <Input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Pagamento</Label>
              <Input
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as StatusTransacao)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Recorrência</Label>
              <Select value={recorrencia} onValueChange={(v) => setRecorrencia(v as TipoRecorrencia)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  {Object.entries(RECORRENCIA_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fornecedor</Label>
            <Select value={fornecedorId || "__none__"} onValueChange={(v) => setFornecedorId(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um fornecedor" />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                <SelectItem value="__none__">Nenhum</SelectItem>
                {fornecedoresAtivos.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fornecedoresAtivos.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Cadastre fornecedores na aba "Fornecedores" para selecionar aqui.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Informações adicionais..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isLoading || !descricao || !valor || !dataVencimento}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
