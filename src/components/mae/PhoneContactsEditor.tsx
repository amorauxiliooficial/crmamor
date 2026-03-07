import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Phone, Plus, Star, Trash2 } from "lucide-react";
import { normalizePhoneToE164BR } from "@/lib/phoneUtils";

export interface PhoneEntry {
  id?: string; // existing contact id from mother_contacts
  value: string; // display value with mask
  isPrimary: boolean;
}

interface PhoneContactsEditorProps {
  phones: PhoneEntry[];
  onChange: (phones: PhoneEntry[]) => void;
  maxPhones?: number;
  firstRequired?: boolean;
  disabled?: boolean;
}

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  if (numbers.length <= 10) {
    return numbers
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return numbers
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
};

export function PhoneContactsEditor({
  phones,
  onChange,
  maxPhones = 3,
  firstRequired = false,
  disabled = false,
}: PhoneContactsEditorProps) {
  const handleChange = (index: number, rawValue: string) => {
    const formatted = formatPhone(rawValue);
    const updated = phones.map((p, i) => (i === index ? { ...p, value: formatted } : p));
    onChange(updated);
  };

  const handleAdd = () => {
    if (phones.length >= maxPhones) return;
    onChange([...phones, { value: "", isPrimary: false }]);
  };

  const handleRemove = (index: number) => {
    const wasPrimary = phones[index].isPrimary;
    const updated = phones.filter((_, i) => i !== index);
    if (wasPrimary && updated.length > 0) {
      updated[0].isPrimary = true;
    }
    onChange(updated);
  };

  const handleSetPrimary = (index: number) => {
    const updated = phones.map((p, i) => ({ ...p, isPrimary: i === index }));
    onChange(updated);
  };

  const getValidationError = (phone: PhoneEntry): string | null => {
    if (!phone.value) return null;
    const digits = phone.value.replace(/\D/g, "");
    if (digits.length > 0 && digits.length < 10) return "Número incompleto";
    if (digits.length >= 10 && !normalizePhoneToE164BR(phone.value)) return "Número inválido";
    // Check duplicates
    const normalized = normalizePhoneToE164BR(phone.value);
    if (normalized) {
      const count = phones.filter((p) => normalizePhoneToE164BR(p.value) === normalized).length;
      if (count > 1) return "Duplicado";
    }
    return null;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <Phone className="h-3.5 w-3.5" />
          Telefones de Contato
        </Label>
        {phones.length < maxPhones && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleAdd}
            disabled={disabled}
          >
            <Plus className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {phones.map((phone, index) => {
          const error = getValidationError(phone);
          return (
            <div key={index} className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`h-8 w-8 shrink-0 ${phone.isPrimary ? "text-yellow-500" : "text-muted-foreground"}`}
                onClick={() => handleSetPrimary(index)}
                disabled={disabled}
                title={phone.isPrimary ? "Telefone principal" : "Definir como principal"}
              >
                <Star className={`h-3.5 w-3.5 ${phone.isPrimary ? "fill-current" : ""}`} />
              </Button>
              <div className="flex-1">
                <Input
                  value={phone.value}
                  onChange={(e) => handleChange(index, e.target.value)}
                  placeholder="(00) 00000-0000"
                  disabled={disabled}
                  className={`h-9 ${error ? "border-destructive" : ""}`}
                />
                {error && <span className="text-[10px] text-destructive">{error}</span>}
              </div>
              {!(firstRequired && index === 0 && phones.length === 1) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        })}
        {phones.length === 0 && (
          <p className="text-xs text-muted-foreground py-1">Nenhum telefone cadastrado.</p>
        )}
      </div>
    </div>
  );
}

/** Helper: convert PhoneEntry[] to data ready for mother_contacts */
export function phonesToContactParams(maeId: string, phones: PhoneEntry[]) {
  return phones
    .filter((p) => {
      const digits = p.value.replace(/\D/g, "");
      return digits.length >= 10;
    })
    .map((p) => ({
      mae_id: maeId,
      contact_type: "phone" as const,
      value: p.value,
      is_primary: p.isPrimary,
    }));
}
