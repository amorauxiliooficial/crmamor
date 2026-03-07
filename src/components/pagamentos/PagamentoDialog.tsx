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
import { Badge } from "@/components/ui/badge";
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
import { useFornecedores } from "@/hooks/useFornecedores";
import { Loader2, Plus, Trash2, DollarSign, Calendar, FileText, Percent, Users } from "lucide-react";
import { TipoPagamento, StatusParcela } from "@/types/pagamento";
import { processarComissaoParcela } from "@/lib/comissaoUtils";

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
  valor_a_receber: string;
  percentual_comissao: string;
  fornecedor_id: string;
}

const DEFAULT_PARCELA: ParcelaForm = {
  numero_parcela: 1,
  data_pagamento: "",
  status: "pendente",
  observacoes: "",
  valor: "",
  valor_a_receber: "",
  percentual_comissao: "10",
  fornecedor_id: "",
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
  const { fornecedoresAtivos } = useFornecedores();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tipoPagamento, setTipoPagamento] = useState<TipoPagamento>("parcelado");
  const [parcelas, setParcelas] = useState<ParcelaForm[]>([{ ...DEFAULT_PARCELA }]);

  useEffect(() => {
    if (open && existingPagamentoId) {
      loadExistingPagamento();
    } else if (open && !existingPagamentoId) {
      setTipoPagamento("parcelado");
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
      toast({ variant: "destructive", title: "Erro ao carregar pagamento", description: pagError.message });
      setLoading(false);
      return;
    }

    const { data: parcelasData, error: parcError } = await supabase
      .from("parcelas_pagamento")
      .select("*")
      .eq("pagamento_id", existingPagamentoId)
      .order("numero_parcela", { ascending: true });

    if (parcError) {
      toast({ variant: "destructive", title: "Erro ao carregar parcelas", description: parcError.message });
      setLoading(false);
      return;
    }

    setTipoPagamento(pagamento.tipo_pagamento as TipoPagamento);

    // Try to find fornecedor info from existing commission despesas per parcela
    const parcelaIds = parcelasData?.map((p: any) => p.id) || [];
    let despesaMap: Record<string, { fornecedor_id: string | null }> = {};
    if (parcelaIds.length > 0) {
      const { data: despesas } = await supabase
        .from("despesas")
        .select("parcela_origem_id, fornecedor_id")
        .eq("categoria", "comissao_parceiro" as any)
        .in("parcela_origem_id", parcelaIds as any);
      if (despesas) {
        for (const d of despesas) {
          if (d.parcela_origem_id) {
            despesaMap[d.parcela_origem_id] = { fornecedor_id: d.fornecedor_id };
          }
        }
      }
    }

    const defaultPerc = String(pagamento.percentual_comissao ?? 10);

    if (parcelasData && parcelasData.length > 0) {
      setParcelas(
        parcelasData.map((p: any) => ({
          numero_parcela: p.numero_parcela,
          data_pagamento: p.data_pagamento || "",
          status: p.status as StatusParcela,
          observacoes: p.observacoes || "",
          valor: p.valor ? String(p.valor) : "",
          valor_a_receber: p.valor_a_receber ? String(p.valor_a_receber) : "",
          percentual_comissao: defaultPerc,
          fornecedor_id: despesaMap[p.id]?.fornecedor_id || "",
        }))
      );
    }
    setLoading(false);
  };

  const addParcela = () => {
    // Copy commission settings from last parcela for convenience
    const lastParcela = parcelas[parcelas.length - 1];
    setParcelas((prev) => [
      ...prev,
      {
        ...DEFAULT_PARCELA,
        numero_parcela: prev.length + 1,
        percentual_comissao: lastParcela?.percentual_comissao || "10",
        fornecedor_id: lastParcela?.fornecedor_id || "",
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
    return parcelas.reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0);
  };

  const calcularTotalAReceber = () => {
    return parcelas.reduce((acc, p) => acc + (parseFloat(p.valor_a_receber) || 0), 0);
  };

  const calcularComissaoTotal = () => {
    return parcelas
      .filter((p) => p.status === "pago")
      .reduce((acc, p) => {
        const perc = parseFloat(p.percentual_comissao) || 0;
        const val = parseFloat(p.valor) || 0;
        return acc + Math.round(val * perc) / 100;
      }, 0);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const valorTotal = calcularValorTotal();
      // Use the first parcela's commission as the "global" for pagamentos_mae record
      const percGlobal = parseFloat(parcelas[0]?.percentual_comissao || "10") || 10;

      if (existingPagamentoId) {
        const { error: updateError } = await supabase
          .from("pagamentos_mae")
          .update({
            tipo_pagamento: tipoPagamento,
            total_parcelas: parcelas.length,
            valor_total: valorTotal || null,
            percentual_comissao: percGlobal,
          } as any)
          .eq("id", existingPagamentoId);
        if (updateError) throw updateError;

        // Delete old commission despesas linked to old parcelas before deleting parcelas
        const { data: oldParcelas } = await supabase
          .from("parcelas_pagamento")
          .select("id")
          .eq("pagamento_id", existingPagamentoId);
        if (oldParcelas && oldParcelas.length > 0) {
          const oldIds = oldParcelas.map((p: any) => p.id);
          await supabase
            .from("despesas")
            .delete()
            .eq("categoria", "comissao_parceiro" as any)
            .in("parcela_origem_id", oldIds as any);
        }
        await supabase.from("parcelas_pagamento").delete().eq("pagamento_id", existingPagamentoId);
        for (const parcela of parcelas) {
          const perc = parseFloat(parcela.percentual_comissao) || 10;
          const fornId = parcela.fornecedor_id && parcela.fornecedor_id !== "none" ? parcela.fornecedor_id : null;
          const selectedForn = fornecedoresAtivos.find((f) => f.id === fornId);

          const { data: inserted, error: insertError } = await supabase.from("parcelas_pagamento").insert({
            pagamento_id: existingPagamentoId,
            numero_parcela: parcela.numero_parcela,
            data_pagamento: parcela.data_pagamento || null,
            status: parcela.status,
            observacoes: parcela.observacoes || null,
            valor: parcela.valor ? parseFloat(parcela.valor) : null,
            valor_a_receber: parcela.valor_a_receber ? parseFloat(parcela.valor_a_receber) : null,
          } as any).select().single();
          if (insertError) throw insertError;
          if (parcela.status === "pago" && parcela.valor && parseFloat(parcela.valor) > 0 && inserted) {
            await processarComissaoParcela({
              parcelaId: inserted.id,
              valorParcela: parseFloat(parcela.valor),
              userId: user.id,
              maeNome,
              numeroParcela: parcela.numero_parcela,
              percentualComissao: perc,
              fornecedorId: fornId,
              fornecedorNome: selectedForn?.nome || null,
            });
          }
        }
      } else {
        const { data: newPagamento, error: pagError } = await supabase
          .from("pagamentos_mae")
          .insert({
            mae_id: maeId,
            user_id: user.id,
            tipo_pagamento: tipoPagamento,
            total_parcelas: parcelas.length,
            valor_total: valorTotal || null,
            percentual_comissao: percGlobal,
          } as any)
          .select()
          .single();
        if (pagError) throw pagError;

        for (const parcela of parcelas) {
          const perc = parseFloat(parcela.percentual_comissao) || 10;
          const fornId = parcela.fornecedor_id && parcela.fornecedor_id !== "none" ? parcela.fornecedor_id : null;
          const selectedForn = fornecedoresAtivos.find((f) => f.id === fornId);

          const { data: inserted, error: insertError } = await supabase.from("parcelas_pagamento").insert({
            pagamento_id: newPagamento.id,
            numero_parcela: parcela.numero_parcela,
            data_pagamento: parcela.data_pagamento || null,
            status: parcela.status,
            observacoes: parcela.observacoes || null,
            valor: parcela.valor ? parseFloat(parcela.valor) : null,
            valor_a_receber: parcela.valor_a_receber ? parseFloat(parcela.valor_a_receber) : null,
          } as any).select().single();
          if (insertError) throw insertError;
          if (parcela.status === "pago" && parcela.valor && parseFloat(parcela.valor) > 0 && inserted) {
            await processarComissaoParcela({
              parcelaId: inserted.id,
              valorParcela: parseFloat(parcela.valor),
              userId: user.id,
              maeNome,
              numeroParcela: parcela.numero_parcela,
              percentualComissao: perc,
              fornecedorId: fornId,
              fornecedorNome: selectedForn?.nome || null,
            });
          }
        }
      }

      toast({
        title: "Sucesso",
        description: existingPagamentoId ? "Pagamento atualizado com sucesso" : "Pagamento cadastrado com sucesso",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao salvar pagamento", description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTipoPagamentoChange = (value: TipoPagamento) => {
    setTipoPagamento(value);
    if (value === "a_vista") {
      setParcelas([{ ...DEFAULT_PARCELA }]);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {existingPagamentoId ? "Editar" : "Cadastrar"} Pagamento — {maeNome}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Config section - only tipo now */}
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Tipo</Label>
                <Select value={tipoPagamento} onValueChange={handleTipoPagamentoChange}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="a_vista">Mãe Única</SelectItem>
                    <SelectItem value="parcelado">Mãe Parcelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Parcelas header with summary badges */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-semibold">Parcelas ({parcelas.length})</h3>
                {tipoPagamento === "parcelado" && (
                  <Button type="button" variant="outline" size="sm" onClick={addParcela} className="h-8">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Adicionar
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono text-xs h-6 px-2.5">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Nosso: {formatCurrency(calcularValorTotal())}
                </Badge>
                <Badge variant="outline" className="font-mono text-xs h-6 px-2.5 border-primary/30 text-primary">
                  Mãe recebe: {formatCurrency(calcularTotalAReceber())}
                </Badge>
                {calcularComissaoTotal() > 0 && (
                  <Badge className="font-mono text-xs h-6 px-2.5 bg-accent text-accent-foreground">
                    <Percent className="h-3 w-3 mr-1" />
                    Comissão: {formatCurrency(calcularComissaoTotal())}
                  </Badge>
                )}
              </div>
            </div>

            {/* Parcelas cards */}
            <div className="space-y-3">
              {parcelas.map((parcela, index) => {
                const parcelaComissao = Math.round((parseFloat(parcela.valor) || 0) * (parseFloat(parcela.percentual_comissao) || 0)) / 100;
                const fornecedorSelecionado = fornecedoresAtivos.find((f) => f.id === parcela.fornecedor_id);

                return (
                  <div
                    key={index}
                    className={`relative rounded-xl border p-4 space-y-3 transition-all ${
                      parcela.status === "pago"
                        ? "bg-primary/5 border-primary/20"
                        : parcela.status === "inadimplente"
                        ? "bg-destructive/5 border-destructive/20"
                        : "bg-card"
                    }`}
                  >
                    {/* Parcela header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-semibold px-2.5">
                          {parcela.numero_parcela}ª parcela
                        </Badge>
                        {parcela.status === "pago" && parcela.valor && parcelaComissao > 0 && (
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-mono border-primary/30 text-primary">
                            <Percent className="h-2.5 w-2.5 mr-0.5" />
                            {formatCurrency(parcelaComissao)}
                          </Badge>
                        )}
                      </div>
                      {tipoPagamento === "parcelado" && parcelas.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeParcela(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>

                    {/* Fields - row 1: Valor, Data */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> Valor (R$)
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={parcela.valor}
                          onChange={(e) => updateParcela(index, "valor", e.target.value)}
                          placeholder="0,00"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Data
                        </Label>
                        <Input
                          type="date"
                          value={parcela.data_pagamento}
                          onChange={(e) => updateParcela(index, "data_pagamento", e.target.value)}
                          className="h-10"
                        />
                      </div>
                    </div>

                    {/* Fields - row 2: Status, Mãe recebe */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Status</Label>
                        <Select
                          value={parcela.status}
                          onValueChange={(value) => updateParcela(index, "status", value)}
                        >
                          <SelectTrigger className="h-10">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`shrink-0 inline-block h-2 w-2 rounded-full ${
                                parcela.status === "pago" ? "bg-primary" :
                                parcela.status === "inadimplente" ? "bg-destructive" : "bg-muted-foreground/50"
                              }`} />
                              <span className="truncate"><SelectValue /></span>
                            </div>
                          </SelectTrigger>
                          <SelectContent className="z-[100]">
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="pago">Pago</SelectItem>
                            <SelectItem value="inadimplente">Inadimplente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> Mãe recebe
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={parcela.valor_a_receber}
                          onChange={(e) => updateParcela(index, "valor_a_receber", e.target.value)}
                          placeholder="Conferência"
                          className="h-10"
                        />
                      </div>
                    </div>

                    {/* Fields - row 3: Comissão % and Fornecedor */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Percent className="h-3 w-3" /> Comissão
                        </Label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            value={parcela.percentual_comissao}
                            onChange={(e) => updateParcela(index, "percentual_comissao", e.target.value)}
                            placeholder="10"
                            className="h-10 pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> Fornecedor
                        </Label>
                        <Select
                          value={parcela.fornecedor_id || "none"}
                          onValueChange={(value) => updateParcela(index, "fornecedor_id", value === "none" ? "" : value)}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Nenhum" />
                          </SelectTrigger>
                          <SelectContent className="z-[100]">
                            <SelectItem value="none">Nenhum</SelectItem>
                            {fornecedoresAtivos.map((f) => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Fields - row 4: Observações full width */}
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" /> Observações
                      </Label>
                      <Input
                        value={parcela.observacoes}
                        onChange={(e) => updateParcela(index, "observacoes", e.target.value)}
                        placeholder="Observações da parcela"
                        className="h-10"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t">
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
