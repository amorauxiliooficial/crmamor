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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { TipoPagamento, StatusParcela } from "@/types/pagamento";

interface PagamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maeId: string;
  maeNome: string;
  onSuccess: () => void;
  existingPagamentoId?: string;
}

interface ParcelaForm {
  numero_parcela: number;
  data_pagamento: string;
  status: StatusParcela;
  observacoes: string;
  valor: string;
}

const DEFAULT_PARCELA: ParcelaForm = {
  numero_parcela: 1,
  data_pagamento: "",
  status: "pendente",
  observacoes: "",
  valor: "",
};

export function PagamentoDialog({
  open,
  onOpenChange,
  maeId,
  maeNome,
  onSuccess,
  existingPagamentoId,
}: PagamentoDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tipoPagamento, setTipoPagamento] = useState<TipoPagamento>("parcelado");
  const [percentualComissao, setPercentualComissao] = useState("");
  const [valorAReceber, setValorAReceber] = useState("");
  const [parcelas, setParcelas] = useState<ParcelaForm[]>([{ ...DEFAULT_PARCELA }]);

  useEffect(() => {
    if (open && existingPagamentoId) {
      loadExistingPagamento();
    } else if (open && !existingPagamentoId) {
      setTipoPagamento("parcelado");
      setPercentualComissao("");
      setValorAReceber("");
      setParcelas([{ ...DEFAULT_PARCELA }]);
    }
  }, [open, existingPagamentoId]);

  const loadExistingPagamento = async () => {
    if (!existingPagamentoId) return;
    
    setLoading(true);
    const { data: pagamento, error: pagError } = await supabase
      .from("pagamentos_mae")
      .select("*")
      .eq("id", existingPagamentoId)
      .single();

    if (pagError) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar pagamento",
        description: pagError.message,
      });
      setLoading(false);
      return;
    }

    const { data: parcelasData, error: parcError } = await supabase
      .from("parcelas_pagamento")
      .select("*")
      .eq("pagamento_id", existingPagamentoId)
      .order("numero_parcela", { ascending: true });

    if (parcError) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar parcelas",
        description: parcError.message,
      });
      setLoading(false);
      return;
    }

    setTipoPagamento(pagamento.tipo_pagamento as TipoPagamento);
    setPercentualComissao(pagamento.percentual_comissao?.toString() || "");
    setValorAReceber((pagamento as any).valor_a_receber?.toString() || "");
    if (parcelasData && parcelasData.length > 0) {
      setParcelas(
        parcelasData.map((p: any) => ({
          numero_parcela: p.numero_parcela,
          data_pagamento: p.data_pagamento || "",
          status: p.status as StatusParcela,
          observacoes: p.observacoes || "",
          valor: p.valor ? String(p.valor) : "",
        }))
      );
    }
    setLoading(false);
  };

  const addParcela = () => {
    setParcelas((prev) => [
      ...prev,
      {
        numero_parcela: prev.length + 1,
        data_pagamento: "",
        status: "pendente",
        observacoes: "",
        valor: "",
      },
    ]);
  };

  const removeParcela = (index: number) => {
    setParcelas((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((p, i) => ({ ...p, numero_parcela: i + 1 }));
    });
  };

  const updateParcela = (index: number, field: keyof ParcelaForm, value: string) => {
    setParcelas((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const calcularValorTotal = () => {
    return parcelas.reduce((acc, p) => {
      const valor = parseFloat(p.valor) || 0;
      return acc + valor;
    }, 0);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      const valorTotal = calcularValorTotal();

      if (existingPagamentoId) {
        // Update existing
        const { error: updateError } = await supabase
          .from("pagamentos_mae")
          .update({
            tipo_pagamento: tipoPagamento,
            total_parcelas: parcelas.length,
            valor_total: valorTotal || null,
            percentual_comissao: percentualComissao ? parseFloat(percentualComissao) : null,
            valor_a_receber: valorAReceber ? parseFloat(valorAReceber) : null,
          } as any)
          .eq("id", existingPagamentoId);

        if (updateError) throw updateError;

        // Delete old parcelas and insert new ones
        await supabase
          .from("parcelas_pagamento")
          .delete()
          .eq("pagamento_id", existingPagamentoId);

        for (const parcela of parcelas) {
          const { error: insertError } = await supabase.from("parcelas_pagamento").insert({
            pagamento_id: existingPagamentoId,
            numero_parcela: parcela.numero_parcela,
            data_pagamento: parcela.data_pagamento || null,
            status: parcela.status,
            observacoes: parcela.observacoes || null,
            valor: parcela.valor ? parseFloat(parcela.valor) : null,
          });
          if (insertError) throw insertError;
        }
      } else {
        // Create new
        const { data: newPagamento, error: pagError } = await supabase
          .from("pagamentos_mae")
          .insert({
            mae_id: maeId,
            user_id: user.id,
            tipo_pagamento: tipoPagamento,
            total_parcelas: parcelas.length,
            valor_total: valorTotal || null,
            percentual_comissao: percentualComissao ? parseFloat(percentualComissao) : null,
            valor_a_receber: valorAReceber ? parseFloat(valorAReceber) : null,
          } as any)
          .select()
          .single();

        if (pagError) throw pagError;

        for (const parcela of parcelas) {
          const { error: insertError } = await supabase.from("parcelas_pagamento").insert({
            pagamento_id: newPagamento.id,
            numero_parcela: parcela.numero_parcela,
            data_pagamento: parcela.data_pagamento || null,
            status: parcela.status,
            observacoes: parcela.observacoes || null,
            valor: parcela.valor ? parseFloat(parcela.valor) : null,
          });
          if (insertError) throw insertError;
        }
      }

      toast({
        title: "Sucesso",
        description: existingPagamentoId
          ? "Pagamento atualizado com sucesso"
          : "Pagamento cadastrado com sucesso",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar pagamento",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTipoPagamentoChange = (value: TipoPagamento) => {
    setTipoPagamento(value);
    if (value === "a_vista") {
      setParcelas([{ numero_parcela: 1, data_pagamento: "", status: "pendente", observacoes: "", valor: "" }]);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingPagamentoId ? "Editar" : "Cadastrar"} Pagamento - {maeNome}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Pagamento</Label>
                <Select value={tipoPagamento} onValueChange={handleTipoPagamentoChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a_vista">Mãe Única</SelectItem>
                    <SelectItem value="parcelado">Mãe Parcelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Comissão (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={percentualComissao}
                  onChange={(e) => setPercentualComissao(e.target.value)}
                  placeholder="Ex: 10"
                />
              </div>

              <div className="space-y-2">
                <Label>Valor que a mãe vai receber (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valorAReceber}
                  onChange={(e) => setValorAReceber(e.target.value)}
                  placeholder="Apenas conferência"
                />
                <p className="text-[10px] text-muted-foreground">Apenas para referência — não entra em cálculos.</p>
              </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Label>Parcelas ({parcelas.length})</Label>
                  <span className="text-sm text-muted-foreground">
                    Valor Total: <span className="font-semibold text-foreground">{formatCurrency(calcularValorTotal())}</span>
                  </span>
                </div>
                {tipoPagamento === "parcelado" && (
                  <Button type="button" variant="outline" size="sm" onClick={addParcela}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Parcela
                  </Button>
                )}
              </div>

              {parcelas.map((parcela, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg bg-muted/30"
                >
                  <div className="col-span-1 text-center font-medium text-muted-foreground">
                    {parcela.numero_parcela}ª
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={parcela.valor}
                      onChange={(e) => updateParcela(index, "valor", e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Data Pagamento</Label>
                    <Input
                      type="date"
                      value={parcela.data_pagamento}
                      onChange={(e) => updateParcela(index, "data_pagamento", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={parcela.status}
                      onValueChange={(value) => updateParcela(index, "status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="inadimplente">Inadimplente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4">
                    <Label className="text-xs">Observações</Label>
                    <Input
                      value={parcela.observacoes}
                      onChange={(e) => updateParcela(index, "observacoes", e.target.value)}
                      placeholder="Observações"
                    />
                  </div>
                  {tipoPagamento === "parcelado" && parcelas.length > 1 && (
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeParcela(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}