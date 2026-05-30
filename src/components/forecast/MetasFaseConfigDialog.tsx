import { useEffect, useState } from "react";
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save } from "lucide-react";
import { useForecastMetas, MetaFase } from "@/hooks/useForecastMetas";
import { FASES_FUNIL, stripEmoji } from "@/hooks/usePipelineForecast";

interface MetasFaseConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MetasFaseConfigDialog({ open, onOpenChange }: MetasFaseConfigDialogProps) {
  const { metas, premissas, saveMetas, savePremissas } = useForecastMetas();

  const [rows, setRows] = useState<MetaFase[]>([]);
  const [ticketPadrao, setTicketPadrao] = useState(1800);
  const [taxaPadrao, setTaxaPadrao] = useState(75);

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
        };
      })
    );
    if (premissas) {
      setTicketPadrao(premissas.ticket_medio_padrao);
      setTaxaPadrao(premissas.taxa_pagamento_padrao * 100);
    }
  }, [open, metas, premissas]);

  const updateRow = (key: string, patch: Partial<MetaFase>) => {
    setRows((prev) => prev.map((r) => (r.status_processo === key ? { ...r, ...patch } : r)));
  };

  const handleSave = async () => {
    await saveMetas.mutateAsync(rows);
    await savePremissas.mutateAsync({
      ticket_medio_padrao: ticketPadrao,
      taxa_pagamento_padrao: taxaPadrao / 100,
      id: premissas?.id,
    });
    onOpenChange(false);
  };

  const saving = saveMetas.isPending || savePremissas.isPending;

  return (
    <ResponsiveOverlay
      open={open}
      onOpenChange={onOpenChange}
      title="Configurar Metas do Forecast"
      description="Defina metas por fase e premissas globais. Apenas administradores."
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
        {/* Premissas globais */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Premissas globais
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ticket-padrao" className="text-xs">Ticket médio padrão (R$)</Label>
              <Input
                id="ticket-padrao"
                type="number"
                min={0}
                value={ticketPadrao}
                onChange={(e) => setTicketPadrao(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taxa-padrao" className="text-xs">Taxa de pagamento (%)</Label>
              <Input
                id="taxa-padrao"
                type="number"
                min={0}
                max={100}
                value={taxaPadrao}
                onChange={(e) => setTaxaPadrao(Number(e.target.value) || 0)}
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Metas por fase */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Metas por fase
          </h3>
          <div className="space-y-2">
            {FASES_FUNIL.map((fase) => {
              const key = stripEmoji(fase);
              const row = rows.find((r) => r.status_processo === key);
              if (!row) return null;
              const ticketEfetivo = row.ticket_medio ?? ticketPadrao;
              const metaValorCalc = row.meta_quantidade * ticketEfetivo;
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
                          const ticketUsado = ticket ?? ticketPadrao;
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
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </ResponsiveOverlay>
  );
}
