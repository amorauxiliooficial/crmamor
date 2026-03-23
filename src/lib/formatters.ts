export function formatCpf(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, "").padStart(11, "0");
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function formatPhone(phone: string): string {
  let cleaned = String(phone || "").replace(/\D/g, "");

  // Handle Brazil country code (E.164)
  if (cleaned.startsWith("55") && cleaned.length >= 12) {
    cleaned = cleaned.slice(2);
  }

  // If still longer than 11, keep last 11 digits (DD + 9-digit mobile or DD + 8-digit landline)
  if (cleaned.length > 11) {
    cleaned = cleaned.slice(-11);
  }

  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }

  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }

  return cleaned;
}

export function formatDate(date: string | Date): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR");
}
