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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import type { Indicacao } from "@/types/indicacao";

export const FUNIL_OPTIONS = [
  "Gestantes 1 a 8 meses",
  "Gestantes em Maturação",
  "Entradas do Mês",
  "Entrada de Documentos",
  "Aguardando Análise INSS",
] as const;

export type FunilOption = (typeof FUNIL_OPTIONS)[number];

export interface ConvertPayload {
  funil: FunilOption;
  cpf: string; // digits only
  senha_gov: string;
  nome_mae: string;
  telefone: string;
}

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

function formatCpf(value: string) {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  return numbers
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

interface Props {
  indicacao: Indicacao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (indicacao: Indicacao, payload: ConvertPayload) => Promise<void>;
}

export function ConvertToProcessDialog({ indicacao, open, onOpenChange, onConfirm }: Props) {
  const suggested = useMemo(() => detectFunil(indicacao), [indicacao]);
  const [funil, setFunil] = useState<FunilOption>(suggested);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [senhaGov, setSenhaGov] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFunil(suggested);
      setNome(indicacao?.nome_indicada ?? "");
      setTelefone(indicacao?.telefone_indicada ?? "");
      setCpf("");
      setSenhaGov("");
      setError(null);
    }
  }, [open, suggested, indicacao]);

  const cpfDigits = cpf.replace(/\D/g, "");
  const canSubmit = nome.trim().length > 0 && cpfDigits.length === 11 && senhaGov.trim().length > 0;

  const handleConfirm = async () => {
    if (!indicacao) return;
    setError(null);
    if (!nome.trim()) return setError("Informe o nome da mãe.");
    if (cpfDigits.length !== 11) return setError("CPF deve ter 11 dígitos.");
    if (!senhaGov.trim()) return setError("Informe a senha Gov.br.");

    setSubmitting(true);
    try {
      await onConfirm(indicacao, {
        funil,
        cpf: cpfDigits,
        senha_gov: senhaGov.trim(),
        nome_mae: nome.trim(),
        telefone: telefone.trim(),
      });
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || "Erro ao converter.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Converter em processo</DialogTitle>
          <DialogDescription>
            Complete os dados obrigatórios para criar o processo no funil.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="conv-nome">Nome da mãe *</Label>
              <Input
                id="conv-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conv-cpf">CPF *</Label>
              <Input
                id="conv-cpf"
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conv-tel">Telefone</Label>
              <Input
                id="conv-tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(DDD) 9XXXX-XXXX"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="conv-senha">Senha Gov.br *</Label>
              <Input
                id="conv-senha"
                value={senhaGov}
                onChange={(e) => setSenhaGov(e.target.value)}
                placeholder="Senha do Gov.br"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || !canSubmit}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Converter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
