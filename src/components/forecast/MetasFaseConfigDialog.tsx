import { useEffect, useMemo, useState } from "react";
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Target, TrendingUp, Wallet, Layers, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { useForecastMetas, MetaFase } from "@/hooks/useForecastMetas";
import { FASES_FUNIL, stripEmoji, DEFAULT_TICKET_MEDIO } from "@/hooks/usePipelineForecast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MESES_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];


interface MetasFaseConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TabKey = "mensal" | "fases";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function MetasFaseConfigDialog({ open, onOpenChange }: MetasFaseConfigDialogProps) {
  const { metas, saveMetas } = useForecastMetas();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<TabKey>("mensal");
  const [rows, setRows] = useState<MetaFase[]>([]);
  const [valorMensal, setValorMensal] = useState<string>("");

  // Meta Financeira Mensal
  const { data: metaMensal, isLoading: loadingMensal } = useQuery({
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
    if (!open) return;
    const byKey = new Map(metas.map((m) => [m.status_processo, m]));
    setRows(
      FASES_FUNIL.map((fase) => {
        const key = stripEmoji(fase);
        const existing = byKey.get(key);
        return {
          status_processo: key,
          meta_valor: existing?.meta_valor ?? 0,
          meta_quantidade: existing?.meta_quantidade ?? 0,
          ticket_medio: existing?.ticket_medio ?? null,
          taxa_pagamento: existing?.taxa_pagamento ?? null,
        };
      })
    );
  }, [open, metas]);

  useEffect(() => {
    if (open && metaMensal) setValorMensal(String(metaMensal.valor_meta ?? 0));
    else if (open && !loadingMensal && !metaMensal) setValorMensal("");
  }, [open, metaMensal, loadingMensal]);

  const updateRow = (key: string, patch: Partial<MetaFase>) => {
    setRows((prev) => prev.map((r) => (r.status_processo === key ? { ...r, ...patch } : r)));
  };

  const saveMensal = useMutation({
    mutationFn: async () => {
      const numeric = Number(valorMensal) || 0;
      if (metaMensal) {
        const { error } = await supabase
          .from("metas_config")
          .update({ valor_meta: numeric })
          .eq("id", metaMensal.id);
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
      queryClient.invalidateQueries({ queryKey: ["meta_financeira_mensal"] });
      queryClient.invalidateQueries({ queryKey: ["metas_config_receita"] });
    },
  });

  const handleSave = async () => {
    try {
      await Promise.all([saveMensal.mutateAsync(), saveMetas.mutateAsync(rows)]);
      toast.success("Configurações de meta salvas");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    }
  };

  const saving = saveMetas.isPending || saveMensal.isPending;

  const totalMetaFases = useMemo(
    () =>
      rows.reduce((acc, r) => {
        const t = r.ticket_medio ?? DEFAULT_TICKET_MEDIO;
        return acc + r.meta_quantidade * t;
      }, 0),
    [rows]
  );

  const valorMensalNum = Number(valorMensal) || 0;
  const sugestaoAVista = valorMensalNum > 0 ? Math.ceil(valorMensalNum / DEFAULT_TICKET_MEDIO) : 0;

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={onOpenChange}
      title="Configurações de Meta"
      description="Defina a meta financeira mensal e as metas por fase do funil. Apenas administradores."
      desktopWidth="sm:max-w-3xl"
      mobileSide="right"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground hidden sm:block">
            As mudanças entram em vigor após salvar.
          </p>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="min-w-[140px]">
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar tudo
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Tabs */}
        <div className="inline-flex rounded-lg bg-muted p-1 text-sm">
          <button
            type="button"
            onClick={() => setTab("mensal")}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 transition",
              tab === "mensal"
                ? "bg-background shadow-sm font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Target className="h-3.5 w-3.5" />
            Meta do Mês
          </button>
          <button
            type="button"
            onClick={() => setTab("fases")}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 transition",
              tab === "fases"
                ? "bg-background shadow-sm font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Metas por Fase
          </button>
        </div>

        {/* Meta Mensal */}
        {tab === "mensal" && (
          <section className="space-y-4">
            <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
              <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <Target className="h-3.5 w-3.5" />
                  Meta Financeira Mensal
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Valor de receita que o time precisa atingir todo mês. Usada para calcular gap,
                  percentual e composição sugerida.
                </p>

                <div className="mt-4 flex items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Valor da meta (R$)
                    </Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-muted-foreground">
                        R$
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step={100}
                        value={valorMensal}
                        onChange={(e) => setValorMensal(e.target.value)}
                        placeholder="80000"
                        className="h-14 pl-11 text-2xl font-bold tabular-nums"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Mini icon={<Wallet className="h-3.5 w-3.5" />} label="Meta">
                    {fmtBRL(valorMensalNum)}
                  </Mini>
                  <Mini icon={<TrendingUp className="h-3.5 w-3.5" />} label="Ticket padrão">
                    {fmtBRL(DEFAULT_TICKET_MEDIO)}
                  </Mini>
                  <Mini icon={<Target className="h-3.5 w-3.5" />} label="Mães necessárias">
                    {sugestaoAVista > 0 ? `${sugestaoAVista} mães` : "—"}
                  </Mini>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
              Dica: para metas por etapa do funil (qualificação, contrato, aprovada), acesse a aba{" "}
              <span className="font-semibold text-foreground">Metas por Fase</span>.
            </div>
          </section>
        )}

        {/* Metas por fase */}
        {tab === "fases" && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Metas por fase do funil
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Soma estimada: <span className="font-semibold text-foreground">{fmtBRL(totalMetaFases)}</span>
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {FASES_FUNIL.map((fase) => {
                const key = stripEmoji(fase);
                const row = rows.find((r) => r.status_processo === key);
                if (!row) return null;
                const ticketEfetivo = row.ticket_medio ?? DEFAULT_TICKET_MEDIO;
                const metaValorCalc = row.meta_quantidade * ticketEfetivo;
                const isAprovada = key === "Aprovada";
                return (
                  <div
                    key={key}
                    className="rounded-lg border border-border/60 bg-card/40 p-3 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">{fase}</div>
                      <div className="text-[11px] text-muted-foreground tabular-nums">
                        {fmtBRL(metaValorCalc)}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Meta qtd
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          value={row.meta_quantidade}
                          onChange={(e) => {
                            const qtd = Number(e.target.value) || 0;
                            updateRow(key, { meta_quantidade: qtd, meta_valor: qtd * ticketEfetivo });
                          }}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Ticket (R$)
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="padrão"
                          value={row.ticket_medio ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            const ticket = v === "" ? null : Number(v) || 0;
                            const ticketUsado = ticket ?? DEFAULT_TICKET_MEDIO;
                            updateRow(key, {
                              ticket_medio: ticket,
                              meta_valor: row.meta_quantidade * ticketUsado,
                            });
                          }}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Meta valor (R$)
                        </Label>
                        <Input
                          type="number"
                          value={metaValorCalc}
                          readOnly
                          tabIndex={-1}
                          className="h-9 text-sm bg-muted/40 cursor-not-allowed"
                        />
                      </div>
                    </div>
                    {isAprovada && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            Taxa de pagamento (%)
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            placeholder="75"
                            value={row.taxa_pagamento !== null ? row.taxa_pagamento * 100 : ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              const pct = v === "" ? null : (Number(v) || 0) / 100;
                              updateRow(key, { taxa_pagamento: pct });
                            }}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </ResponsiveOverlay>
  );
}

function Mini({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/70 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-sm font-bold tabular-nums">{children}</div>
    </div>
  );
}
