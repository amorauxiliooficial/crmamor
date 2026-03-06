/**
 * Contact display name logic with WhatsApp-style fallback.
 * 
 * Priority:
 * 1. CRM name (from mae_processo via wa_conversations.mae_id)
 * 2. wa_name from WhatsApp profile
 * 3. Formatted phone number
 */

import { formatPhone } from "@/lib/formatters";

export interface ContactDisplayInfo {
  /** Primary display name */
  displayName: string;
  /** Secondary line (subtitle) — null if CRM name is known */
  subtitle: string | null;
  /** Initials for avatar */
  initials: string;
}

/**
 * Format E.164 phone to readable BR format.
 * Input: "+5511999991234" or "5511999991234"
 * Output: "(11) 99999-1234"
 */
function formatE164ToBR(phone: string): string {
  // Strip + and country code 55
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) {
    digits = digits.slice(2);
  }
  return formatPhone(digits);
}

function getLastDigits(phone: string, count = 4): string {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-count);
}

function abbreviateName(name: string, maxLen = 20): string {
  if (name.length <= maxLen) return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name.slice(0, maxLen);
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

export function getContactDisplay(
  crmName: string | null | undefined,
  waName: string | null | undefined,
  phone: string,
): ContactDisplayInfo {
  const formattedPhone = formatE164ToBR(phone);
  const name = crmName?.trim() || waName?.trim() || null;

  if (name) {
    return {
      displayName: name,
      subtitle: formattedPhone,
      initials: name.charAt(0).toUpperCase(),
    };
  }

  return {
    displayName: formattedPhone,
    subtitle: null,
    initials: "#",
  };
}
