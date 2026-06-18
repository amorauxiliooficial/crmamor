import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface AddressValue {
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

interface AddressFieldsProps {
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  disabled?: boolean;
}

const UF_OPTIONS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const formatCep = (raw: string) => {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

export function AddressFields({ value, onChange, disabled }: AddressFieldsProps) {
  const [loading, setLoading] = useState(false);
  const [cepGenerico, setCepGenerico] = useState(false);

  const lookupCep = async (cepRaw: string) => {
    const digits = cepRaw.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data?.erro) {
        toast.error("CEP não encontrado");
        setCepGenerico(false);
        return;
      }
      const generico = !data.logradouro && !data.bairro;
      setCepGenerico(generico);
      onChange({
        ...value,
        cep: formatCep(digits),
        endereco: data.logradouro || value.endereco,
        bairro: data.bairro || value.bairro,
        cidade: data.localidade || value.cidade,
        uf: data.uf || value.uf,
      });
      if (generico) {
        toast.warning("CEP único da cidade — preencha rua e bairro manualmente");
      } else {
        toast.success("Endereço preenchido pelo CEP");
      }
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setLoading(false);
    }
  };

  const handleCepChange = (raw: string) => {
    const formatted = formatCep(raw);
    onChange({ ...value, cep: formatted });
    const digits = formatted.replace(/\D/g, "");
    if (digits.length === 8) {
      lookupCep(digits);
    } else {
      setCepGenerico(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Endereço
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="space-y-1.5 col-span-2">
          <Label htmlFor="cep">CEP</Label>
          <div className="relative">
            <Input
              id="cep"
              value={value.cep}
              onChange={(e) => handleCepChange(e.target.value)}
              onBlur={(e) => lookupCep(e.target.value)}
              placeholder="00000-000"
              inputMode="numeric"
              disabled={disabled}
            />
            {loading && (
              <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Digite o CEP para preencher
          </p>
        </div>

        <div className="space-y-1.5 col-span-2 sm:col-span-3">
          <Label htmlFor="endereco">
            Rua / Logradouro
            {cepGenerico && <span className="text-amber-500 ml-1">*</span>}
          </Label>
          <Input
            id="endereco"
            value={value.endereco}
            onChange={(e) => onChange({ ...value, endereco: e.target.value })}
            placeholder={cepGenerico ? "Digite a rua" : "Preenchido pelo CEP"}
            disabled={disabled}
            className={cepGenerico && !value.endereco ? "border-amber-500" : ""}
          />
        </div>

        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label htmlFor="numero">Número</Label>
          <Input
            id="numero"
            value={value.numero}
            onChange={(e) => onChange({ ...value, numero: e.target.value })}
            placeholder="Nº"
            disabled={disabled}
          />
        </div>

        <div className="space-y-1.5 col-span-2 sm:col-span-3">
          <Label htmlFor="complemento">Complemento</Label>
          <Input
            id="complemento"
            value={value.complemento}
            onChange={(e) => onChange({ ...value, complemento: e.target.value })}
            placeholder="Apto, bloco (opcional)"
            disabled={disabled}
          />
        </div>

        <div className="space-y-1.5 col-span-2 sm:col-span-3">
          <Label htmlFor="bairro">
            Bairro
            {cepGenerico && <span className="text-amber-500 ml-1">*</span>}
          </Label>
          <Input
            id="bairro"
            value={value.bairro}
            onChange={(e) => onChange({ ...value, bairro: e.target.value })}
            placeholder={cepGenerico ? "Digite o bairro" : "Preenchido pelo CEP"}
            disabled={disabled}
            className={cepGenerico && !value.bairro ? "border-amber-500" : ""}
          />
        </div>

        <div className="space-y-1.5 col-span-2 sm:col-span-4">
          <Label htmlFor="cidade">Cidade</Label>
          <Input
            id="cidade"
            value={value.cidade}
            onChange={(e) => onChange({ ...value, cidade: e.target.value })}
            placeholder="Preenchido pelo CEP"
            disabled={disabled}
          />
        </div>

        <div className="space-y-1.5 col-span-2 sm:col-span-2">
          <Label htmlFor="uf">UF</Label>
          <Select
            value={value.uf}
            onValueChange={(v) => onChange({ ...value, uf: v })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="UF" />
            </SelectTrigger>
            <SelectContent className="z-[100]">
              {UF_OPTIONS.map((uf) => (
                <SelectItem key={uf} value={uf}>{uf}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export const emptyAddress = (): AddressValue => ({
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
});

export function buildEnderecoCompleto(a: Partial<AddressValue>): string {
  const parts: string[] = [];
  if (a.endereco) parts.push(a.endereco + (a.numero ? `, ${a.numero}` : ""));
  if (a.complemento) parts.push(a.complemento);
  if (a.bairro) parts.push(a.bairro);
  if (a.cidade || a.uf) parts.push([a.cidade, a.uf].filter(Boolean).join(" - "));
  if (a.cep) parts.push(`CEP ${a.cep}`);
  return parts.join(", ");
}
