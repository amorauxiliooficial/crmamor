export interface BrazilPhoneResult {
  display: string;
  dial: string;
}

/**
 * Normalizes any stored Brazilian phone number into two outputs:
 * - display: "+55 (DDD) NNNNN-NNNN"
 * - dial:    "55DDDNNNNNNNNN" (digits only, for WhatsApp/dialing)
 *
 * Rules:
 * 1. Strip all non-digit characters first.
 * 2. If the number already starts with 55, do NOT duplicate it.
 * 3. If it has 10 or 11 local digits, prepend 55.
 */
export function formatBrazilPhone(raw: string | null | undefined): BrazilPhoneResult | null {
  if (!raw) return null;

  let digits = raw.replace(/\D/g, "");

  // Already has country code — keep as-is
  if (digits.startsWith("55") && digits.length >= 12) {
    // valid: e.g. 5511999991234 (13 digits)
  } else if (digits.length >= 10 && digits.length <= 11) {
    // Local digits — prepend 55
    digits = "55" + digits;
  } else {
    return null;
  }

  const ddd = digits.slice(2, 4);
  const number = digits.slice(4);

  let display: string;
  if (number.length === 9) {
    // Mobile: (DD) 99999-9999
    display = `+55 (${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
  } else if (number.length === 8) {
    // Landline: (DD) 9999-9999
    display = `+55 (${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
  } else {
    return null;
  }

  return { display, dial: digits };
}
