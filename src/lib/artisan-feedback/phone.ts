// Phone-number normalisation for WhatsApp links.
//
// wa.me needs the number in full international format with digits only —
// no "+", spaces, dashes or leading zeros (e.g. 919876543210). Admins type
// numbers all sorts of ways, so we accept the common Indian formats and
// anything explicitly written with a "+" / "00" country prefix, and refuse to
// guess on anything else (a wrong guess would message a stranger).

export const DEFAULT_COUNTRY_CODE = "91";

export type NormalizedPhone = {
  /** Digits only, international format — what wa.me expects. e.g. "919876543210" */
  digits: string;
  /** E.164 with a leading "+" — what we store. e.g. "+919876543210" */
  e164: string;
};

const ALLOWED_CHARS = /^[+\d\s().-]+$/;
const INDIAN_MOBILE = /^[6-9]\d{9}$/;

export function normalizePhone(input: string | null | undefined): NormalizedPhone | null {
  if (typeof input !== "string") return null;
  const raw = input.trim();
  if (!raw || !ALLOWED_CHARS.test(raw)) return null;

  // "+" is only meaningful as the very first character.
  const plusIndex = raw.indexOf("+");
  if (plusIndex > 0 || raw.lastIndexOf("+") > 0) return null;

  let digits = raw.replace(/\D/g, "");
  let international = plusIndex === 0;

  // "0091..." is the same as "+91..."
  if (!international && digits.startsWith("00")) {
    digits = digits.slice(2);
    international = true;
  }

  if (international) {
    // Tolerate the common "+91 0 98765 43210" (stray trunk zero).
    if (digits.startsWith("910") && digits.length === 13 && INDIAN_MOBILE.test(digits.slice(3))) {
      digits = "91" + digits.slice(3);
    }
    if (!/^[1-9]\d{7,14}$/.test(digits)) return null; // E.164: max 15 digits
    if (digits.startsWith(DEFAULT_COUNTRY_CODE) && !isValidIndian(digits)) return null;
    return { digits, e164: `+${digits}` };
  }

  // No explicit country code: only accept unambiguous Indian formats.
  if (INDIAN_MOBILE.test(digits)) digits = DEFAULT_COUNTRY_CODE + digits; //  9876543210
  else if (digits.length === 11 && digits[0] === "0" && INDIAN_MOBILE.test(digits.slice(1))) {
    digits = DEFAULT_COUNTRY_CODE + digits.slice(1); //                       09876543210
  } else if (isValidIndian(digits)) {
    // 919876543210 — already has the country code
  } else {
    return null;
  }
  return { digits, e164: `+${digits}` };
}

function isValidIndian(digits: string): boolean {
  return digits.length === 12 && digits.startsWith(DEFAULT_COUNTRY_CODE) && INDIAN_MOBILE.test(digits.slice(2));
}

/**
 * Picks the number to message for an artisan.
 * An explicit WhatsApp number always wins — and if it is set but invalid we
 * do NOT silently fall back to `phone` (that could message the wrong person);
 * the link is reported unavailable instead. `phone` is only used when no
 * WhatsApp number was entered at all.
 */
export function resolveArtisanWhatsapp(artisan: {
  whatsappNumber?: string | null;
  phone?: string | null;
}): { number: NormalizedPhone | null; source: "whatsappNumber" | "phone" | "none" } {
  const wa = artisan.whatsappNumber?.trim();
  if (wa) return { number: normalizePhone(wa), source: "whatsappNumber" };
  const phone = artisan.phone?.trim();
  if (phone) return { number: normalizePhone(phone), source: "phone" };
  return { number: null, source: "none" };
}
