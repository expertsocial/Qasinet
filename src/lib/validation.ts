/**
 * Validates and normalizes a Kenyan phone number.
 * Accepts formats:
 * - 07XXXXXXXX
 * - 01XXXXXXXX
 * - 2547XXXXXXXX
 * - 2541XXXXXXXX
 * - +2547XXXXXXXX
 * - +2541XXXXXXXX
 *
 * Normalizes internally to: 07XXXXXXXX or 01XXXXXXXX
 */

export function normalizeKenyanPhone(phone: string): string {
  // Remove all non-numeric characters (except leading + which we handle via regex or just strip all)
  const cleaned = phone.replace(/\D/g, "");

  // Match the core 9 digits after the prefix (either 7 or 1)
  // e.g., 254 7 12 345 678 -> core is 712345678
  // 0 7 12 345 678 -> core is 712345678

  // We look for the last 9 digits assuming they start with 7 or 1.
  // A standard Kenyan mobile number has 10 digits locally (07... or 01...),
  // or 12 digits internationally (2547... or 2541...).

  if (cleaned.length === 10 && (cleaned.startsWith("07") || cleaned.startsWith("01"))) {
    return cleaned;
  }

  if (cleaned.length === 12 && cleaned.startsWith("254")) {
    const prefix = cleaned.substring(3, 4);
    if (prefix === "7" || prefix === "1") {
      return `0${cleaned.substring(3)}`;
    }
  }

  // If it doesn't match standard lengths/prefixes, return the original cleaned
  // so validation can explicitly fail it rather than us silently truncating.
  return cleaned;
}

export function isValidKenyanPhone(phone: string): boolean {
  const normalized = normalizeKenyanPhone(phone);
  
  // Must be exactly 10 digits and start with 07 or 01
  return /^0[17]\d{8}$/.test(normalized);
}

export function getPhoneValidationError(phone: string): string | null {
  if (!phone) return "Phone number is required";
  
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 9) return "Phone number is too short";
  
  if (!isValidKenyanPhone(phone)) {
    return "Please enter a valid Kenyan mobile number (e.g., 0712345678)";
  }
  
  return null;
}
