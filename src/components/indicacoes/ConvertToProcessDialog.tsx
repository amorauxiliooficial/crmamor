import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import type { Indicacao } from "@/types/indicacao";

export const FUNIL_OPTIONS = [
  "Gestantes 1 a 8 meses",
  "Gestantes em Maturação",
  "Entradas do Mês",
  "Entrada de Documentos",
  "Aguardando Análise INSS",
] as const;

export type FunilOption = (typeof FUNIL_OPTIONS)[number];

/**
 * Auto-detect funil baseado em pistas do registro de indicação.
 * Default = "Entradas do Mês" (caso mais comum).
 */
export function detectFunil(indicacao: Indicacao | null): FunilOption {
  if (!indicacao) return "Entradas do Mês";
  const haystack = [
    indicacao.observacoes,
    indicacao.proxima_acao_observacao,
    indicacao.motivo_abordagem,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/gestante|gravid|dpp|gravida|gestação/.test(haystack)) {
    return "Gestantes 1 a 8 meses";
  }
  if (/inss|protocolo|aguardando análise|análise inss/.test(haystack)) {
    return "Aguardando Análise INSS";
  }
  return "Entradas do Mês";
}

interface Props {
  indicacao: Indicacao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (indicacao: Indicacao, funil: FunilOption) => Promise<void>;
}

export function ConvertToProcessDialog({ indicacao, open, onOpenChange, onConfirm }: Props) {
  const suggested = useMemo(() => detectFunil(indicacao), [indicacao]);
  const [funil, setFunil] = useState<FunilOption>(suggested);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setFunil(suggested);
  }, [open, suggested]);

  const handleConfirm = async () => {
    if (!indicacao) return;
    setSubmitting(true);
    try {
      await onConfirm(indicacao, funil);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Converter em processo</DialogTitle>
          <DialogDescription>
            {indicacao?.nome_indicada ? `Selecione o funil de entrada para ${indicacao.nome_indicada}.` : "Selecione o funil de entrada."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground flex items-start gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <span>
              Sugestão automática: <span className="font-medium text-foreground">{suggested}</span>
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="funil-select">Funil de destino</Label>
            <Select value={funil} onValueChange={(v) => setFunil(v as FunilOption)}>
              <SelectTrigger id="funil-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                {FUNIL_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Converter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
