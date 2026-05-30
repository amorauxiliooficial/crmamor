import { useEffect, useState } from "react";
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { useForecastMetas, MetaFase } from "@/hooks/useForecastMetas";
import { FASES_FUNIL, stripEmoji, DEFAULT_TICKET_MEDIO } from "@/hooks/usePipelineForecast";

interface MetasFaseConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MetasFaseConfigDialog({ open, onOpenChange }: MetasFaseConfigDialogProps) {
  const { metas, saveMetas } = useForecastMetas();

  const [rows, setRows] = useState<MetaFase[]>([]);

  // Reset apenas quando abre (evita perda de edição)
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

  const updateRow = (key: string, patch: Partial<MetaFase>) => {
    setRows((prev) => prev.map((r) => (r.status_processo === key ? { ...r, ...patch } : r)));
  };

  const handleSave = async () => {
    await saveMetas.mutateAsync(rows);
    onOpenChange(false);
  };

  const saving = saveMetas.isPending;

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={onOpenChange}
      title="Configurar Metas do Forecast"
      description="Defina metas por fase do funil. Apenas administradores."
      desktopWidth="sm:max-w-2xl"
      mobileSide="right"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Metas por fase
          </h3>
          <div className="space-y-2">
            {FASES_FUNIL.map((fase) => {
              const key = stripEmoji(fase);
              const row = rows.find((r) => r.status_processo === key);
              if (!row) return null;
              const ticketEfetivo = row.ticket_medio ?? DEFAULT_TICKET_MEDIO;
              const metaValorCalc = row.meta_quantidade * ticketEfetivo;
              const isAprovada = key === "Aprovada";
              return (
                <div key={key} className="rounded-lg border border-border/60 p-3 space-y-2.5 bg-card/40">
                  <div className="text-sm font-semibold">{fase}</div>
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
                          updateRow(key, { ticket_medio: ticket, meta_valor: row.meta_quantidade * ticketUsado });
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
      </div>
    </ResponsiveOverlay>
  );
}
