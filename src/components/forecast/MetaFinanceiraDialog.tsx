import { useEffect, useState } from "react";
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MetaFinanceiraDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [valor, setValor] = useState<string>("");

  const { data: meta, isLoading } = useQuery({
    queryKey: ["meta_financeira_mensal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metas_config")
        .select("*")
        .eq("tipo_meta", "receita")
        .eq("ativo", true)
        .order("created_at", { ascending: true })
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  useEffect(() => {
    if (open && meta) setValor(String(meta.valor_meta ?? 0));
  }, [open, meta]);

  const save = useMutation({
    mutationFn: async () => {
      const numeric = Number(valor) || 0;
      if (meta) {
        const { error } = await supabase
          .from("metas_config")
          .update({ valor_meta: numeric })
          .eq("id", meta.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("metas_config").insert({
          nome: "Meta Financeira Mensal",
          descricao: "Meta de receita projetada do mês",
          tipo_meta: "receita",
          valor_meta: numeric,
          periodo: "mensal",
          ativo: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Meta financeira atualizada");
      queryClient.invalidateQueries({ queryKey: ["meta_financeira_mensal"] });
      queryClient.invalidateQueries({ queryKey: ["metas_config_receita"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={onOpenChange}
      title="Meta Financeira Mensal"
      description="Defina a meta de receita projetada para o mês. O sistema calcula gap, percentual e composição automaticamente."
      desktopWidth="sm:max-w-md"
      mobileSide="right"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || isLoading}>
            {save.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Valor da meta (R$)
          </Label>
          <Input
            type="number"
            min={0}
            step={100}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Ex: 80000"
            className="h-11 text-lg font-semibold tabular-nums"
          />
          <p className="text-[11px] text-muted-foreground">
            Valor aplicado a todos os meses como referência base.
          </p>
        </div>
      </div>
    </ResponsiveOverlay>
  );
}
