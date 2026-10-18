export interface PhoneFormatResult {
  isValid: boolean;
  jid: string;
  formattedNumber: string;
  error?: string;
}

/**
 * Normalizes phone numbers or WhatsApp Group IDs into standard WhatsApp JID format.
 * Examples:
 * - "08123456789" -> "628123456789@c.us"
 * - "+628123456789" -> "628123456789@c.us"
 * - "628123456789" -> "628123456789@c.us"
 * - "120363023456789012@g.us" -> "120363023456789012@g.us"
 */
export function formatToWhatsAppJid(target: string): PhoneFormatResult {
  if (!target || typeof target !== "string") {
    return {
      isValid: false,
      jid: "",
      formattedNumber: "",
      error: "Nomor tujuan tidak boleh kosong.",
    };
  }

  const trimmed = target.trim();

  // If already formatted as a WhatsApp group or user JID
  if (trimmed.endsWith("@g.us")) {
    return {
      isValid: true,
      jid: trimmed,
      formattedNumber: trimmed,
    };
  }

  if (trimmed.endsWith("@c.us")) {
    const rawDigits = trimmed.replace("@c.us", "").replace(/\D/g, "");
    return {
      isValid: rawDigits.length >= 8 && rawDigits.length <= 16,
      jid: `${rawDigits}@c.us`,
      formattedNumber: rawDigits,
      error: rawDigits.length < 8 ? "Format nomor terlalu pendek" : undefined,
    };
  }

  // Strip non-digit characters
  let cleanNumber = trimmed.replace(/\D/g, "");

  // Handle Indonesian local prefix "08..." -> "628..."
  if (cleanNumber.startsWith("0")) {
    cleanNumber = "62" + cleanNumber.substring(1);
  }

  // Basic validation on digit count (international numbers typically 8 - 15 digits)
  if (cleanNumber.length < 8 || cleanNumber.length > 16) {
    return {
      isValid: false,
      jid: "",
      formattedNumber: cleanNumber,
      error: `Nomor telepon '${trimmed}' tidak valid (panjang digit: ${cleanNumber.length}). Minimal 8 digit dan maksimal 16 digit.`,
    };
  }

  return {
    isValid: true,
    jid: `${cleanNumber}@c.us`,
    formattedNumber: cleanNumber,
  };
}
