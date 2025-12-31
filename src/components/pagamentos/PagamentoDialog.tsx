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
import { format } from "date-fns";

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
}

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
  const [parcelas, setParcelas] = useState<ParcelaForm[]>([
    { numero_parcela: 1, data_pagamento: "", status: "pendente", observacoes: "" },
  ]);

  useEffect(() => {
    if (open && existingPagamentoId) {
      loadExistingPagamento();
    } else if (open && !existingPagamentoId) {
      setTipoPagamento("parcelado");
      setParcelas([{ numero_parcela: 1, data_pagamento: "", status: "pendente", observacoes: "" }]);
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
    if (parcelasData && parcelasData.length > 0) {
      setParcelas(
        parcelasData.map((p) => ({
          numero_parcela: p.numero_parcela,
          data_pagamento: p.data_pagamento || "",
          status: p.status as StatusParcela,
          observacoes: p.observacoes || "",
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

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    try {
      if (existingPagamentoId) {
        // Update existing
        await supabase
          .from("pagamentos_mae")
          .update({
            tipo_pagamento: tipoPagamento,
            total_parcelas: parcelas.length,
          })
          .eq("id", existingPagamentoId);

        // Delete old parcelas and insert new ones
        await supabase
          .from("parcelas_pagamento")
          .delete()
          .eq("pagamento_id", existingPagamentoId);

        for (const parcela of parcelas) {
          await supabase.from("parcelas_pagamento").insert({
            pagamento_id: existingPagamentoId,
            numero_parcela: parcela.numero_parcela,
            data_pagamento: parcela.data_pagamento || null,
            status: parcela.status,
            observacoes: parcela.observacoes || null,
          });
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
          })
          .select()
          .single();

        if (pagError) throw pagError;

        for (const parcela of parcelas) {
          await supabase.from("parcelas_pagamento").insert({
            pagamento_id: newPagamento.id,
            numero_parcela: parcela.numero_parcela,
            data_pagamento: parcela.data_pagamento || null,
            status: parcela.status,
            observacoes: parcela.observacoes || null,
          });
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
      setParcelas([{ numero_parcela: 1, data_pagamento: "", status: "pendente", observacoes: "" }]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
            <div className="space-y-2">
              <Label>Tipo de Pagamento</Label>
              <Select value={tipoPagamento} onValueChange={handleTipoPagamentoChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a_vista">À Vista</SelectItem>
                  <SelectItem value="parcelado">Parcelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Parcelas ({parcelas.length})</Label>
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
                  <div className="col-span-3">
                    <Label className="text-xs">Data Pagamento</Label>
                    <Input
                      type="date"
                      value={parcela.data_pagamento}
                      onChange={(e) => updateParcela(index, "data_pagamento", e.target.value)}
                    />
                  </div>
                  <div className="col-span-3">
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
