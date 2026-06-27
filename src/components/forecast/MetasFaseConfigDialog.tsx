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
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  // valores por mês para o ano selecionado (índice 0 = janeiro)
  const [valoresMes, setValoresMes] = useState<string[]>(Array(12).fill(""));

  // Carrega todas as metas de receita (por mês + fallback "mensal")
  const { data: metasReceita, isLoading: loadingMensal } = useQuery({
    queryKey: ["meta_financeira_mensal_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metas_config")
        .select("*")
        .eq("tipo_meta", "receita")
        .eq("ativo", true);
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  // Mapa periodo -> registro
  const metasMap = useMemo(() => {
    const m = new Map<string, any>();
    (metasReceita ?? []).forEach((r: any) => m.set(r.periodo, r));
    return m;
  }, [metasReceita]);

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

  // Quando troca de ano ou carrega dados, preenche os 12 inputs
  useEffect(() => {
    if (!open) return;
    const fallback = metasMap.get("mensal");
    const fallbackVal = fallback ? Number(fallback.valor_meta) || 0 : 0;
    const next = Array.from({ length: 12 }, (_, i) => {
      const key = `${ano}-${String(i + 1).padStart(2, "0")}`;
      const row = metasMap.get(key);
      if (row) return String(Number(row.valor_meta) || 0);
      return fallbackVal ? String(fallbackVal) : "";
    });
    setValoresMes(next);
  }, [open, ano, metasMap]);

  const updateRow = (key: string, patch: Partial<MetaFase>) => {
    setRows((prev) => prev.map((r) => (r.status_processo === key ? { ...r, ...patch } : r)));
  };

  const setMesValor = (idx: number, v: string) => {
    setValoresMes((prev) => prev.map((x, i) => (i === idx ? v : x)));
  };

  const replicarParaTodos = () => {
    const primeiroComValor = valoresMes.find((v) => v && Number(v) > 0) ?? "";
    if (!primeiroComValor) {
      toast.info("Preencha pelo menos um mês antes de replicar");
      return;
    }
    setValoresMes(Array(12).fill(primeiroComValor));
    toast.success(`Valor replicado para todos os meses de ${ano}`);
  };

  const saveMensal = useMutation({
    mutationFn: async () => {
      // upsert por (tipo_meta, periodo) — periodo no formato yyyy-MM
      const payload = valoresMes
        .map((v, i) => ({
          periodo: `${ano}-${String(i + 1).padStart(2, "0")}`,
          valor: Number(v) || 0,
        }));

      for (const item of payload) {
        const existing = metasMap.get(item.periodo);
        if (existing) {
          const { error } = await supabase
            .from("metas_config")
            .update({ valor_meta: item.valor, ativo: true })
            .eq("id", existing.id);
          if (error) throw error;
        } else if (item.valor > 0) {
          const { error } = await supabase.from("metas_config").insert({
            nome: `Meta Receita ${item.periodo}`,
            descricao: `Meta de receita para ${item.periodo}`,
            tipo_meta: "receita",
            valor_meta: item.valor,
            periodo: item.periodo,
            ativo: true,
          });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meta_financeira_mensal_all"] });
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

  const totalAno = useMemo(
    () => valoresMes.reduce((acc, v) => acc + (Number(v) || 0), 0),
    [valoresMes]
  );
  const mediaMes = totalAno / 12;
  const mesAtualIdx = new Date().getMonth();
  const anoAtual = new Date().getFullYear();


  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={onOpenChange}
      title="Configurações de Meta"
      description="Defina a meta financeira mensal e as metas por fase do funil. Apenas administradores."
      desktopWidth="sm:max-w-4xl"
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
        {/* Tabs — segmented control full width */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/70 p-1 text-sm">
          <button
            type="button"
            onClick={() => setTab("mensal")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 transition",
              tab === "mensal"
                ? "bg-background shadow-sm font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Target className="h-4 w-4" />
            Meta por Mês
          </button>
          <button
            type="button"
            onClick={() => setTab("fases")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 transition",
              tab === "fases"
                ? "bg-background shadow-sm font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="h-4 w-4" />
            Metas por Fase
          </button>
        </div>

        {/* Meta Mensal por mês */}
        {tab === "mensal" && (
          <section className="space-y-4">
            {/* Header com seletor de ano e KPIs resumo */}
            <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() => setAno(ano - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-[5rem] text-center">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Ano
                    </div>
                    <div className="text-2xl font-black tabular-nums leading-none text-primary">
                      {ano}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() => setAno(ano + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-1 flex-wrap items-stretch gap-2 sm:justify-end">
                  <ResumoChip label={`Total ${ano}`} value={fmtBRL(totalAno)} icon={<Wallet className="h-3 w-3" />} />
                  <ResumoChip label="Média/mês" value={fmtBRL(mediaMes)} icon={<TrendingUp className="h-3 w-3" />} />
                  <ResumoChip label="Ticket padrão" value={fmtBRL(DEFAULT_TICKET_MEDIO)} icon={<Target className="h-3 w-3" />} />
                </div>
              </div>
            </div>

            {/* Grid de meses */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {MESES_PT.map((mes, idx) => {
                const isMesAtual = ano === anoAtual && idx === mesAtualIdx;
                const isPassado = ano < anoAtual || (ano === anoAtual && idx < mesAtualIdx);
                const val = Number(valoresMes[idx]) || 0;
                return (
                  <div
                    key={mes}
                    className={cn(
                      "group relative rounded-xl border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-sm",
                      isMesAtual && "border-primary ring-2 ring-primary/20 shadow-sm",
                      !isMesAtual && isPassado && "opacity-70",
                      !isMesAtual && !isPassado && "border-border/60"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                        {mes}
                        <span className="ml-1 text-muted-foreground font-normal">
                          /{String(ano).slice(2)}
                        </span>
                      </Label>
                      {isMesAtual && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase text-primary-foreground">
                          Atual
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                        R$
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step={100}
                        value={valoresMes[idx]}
                        onChange={(e) => setMesValor(idx, e.target.value)}
                        placeholder="0"
                        className={cn(
                          "h-11 pl-9 pr-2 text-base font-bold tabular-nums",
                          isMesAtual && "border-primary/40 bg-primary/5"
                        )}
                      />
                    </div>
                    {val > 0 && (
                      <div className="mt-1.5 text-[10px] text-muted-foreground text-right">
                        ≈ {Math.ceil(val / DEFAULT_TICKET_MEDIO)} mães
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Ações + dica */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="outline" size="sm" onClick={replicarParaTodos} className="h-9">
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Replicar para todos os meses
              </Button>
              {loadingMensal && (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> carregando…
                </span>
              )}
            </div>

            <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
              💡 Para metas por etapa do funil (qualificação, contrato, aprovada), acesse a aba{" "}
              <button
                onClick={() => setTab("fases")}
                className="font-semibold text-primary hover:underline"
              >
                Metas por Fase
              </button>
              .
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

function ResumoChip({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/80 px-3 py-1.5 backdrop-blur">
      <div className="text-primary">{icon}</div>
      <div className="leading-tight">
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </div>
        <div className="text-xs font-bold tabular-nums text-foreground">{value}</div>
      </div>
    </div>
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
