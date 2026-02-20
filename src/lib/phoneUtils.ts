/**
 * Normalizes a Brazilian phone number to E.164 format (+55DDDNUMBER).
 * Accepts various formats: (11) 99999-9999, 11999999999, +5511999999999, etc.
 * Returns null if the phone cannot be normalized to a valid Brazilian number.
 */
export function normalizePhoneToE164BR(input: string | null | undefined): string | null {
  if (!input) return null;

  // Remove everything except digits
  let digits = input.replace(/\D/g, "");

  // If it starts with +55 (already has country code in raw input), strip leading 55
  // But only if the raw input started with + or 55
  if (digits.length >= 12 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  // Now we should have DDD + number (10 or 11 digits)
  // 10 digits = landline (DDD 2 + number 8)
  // 11 digits = mobile (DDD 2 + number 9)
  if (digits.length < 10 || digits.length > 11) {
    return null;
  }

  // Validate DDD (first 2 digits should be 11-99)
  const ddd = parseInt(digits.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) {
    return null;
  }

  return `+55${digits}`;
}
