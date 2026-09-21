// The appreciation message and the wa.me deep link.

export const DEFAULT_APPRECIATION_TEMPLATE = [
  "Hi {{artisanName}}! 💜",
  "",
  "I just received my Softoi {{productName}} and I absolutely loved it!",
  "",
  "Thank you so much for your time, creativity and effort that went into making this. 🧶✨",
  "",
  "Your handmade work really means a lot to me. ❤️",
  "",
  "Thank you for making something so special!",
].join("\n");

const MAX_NAME_LENGTH = 80;

/**
 * Names come from the database and end up inside a message the customer will
 * send under their own name, so keep them to one tidy line: drop control and
 * bidi-override characters (used for text spoofing), collapse whitespace and
 * cap the length (also keeps the URL short enough for every browser).
 */
export function sanitizeName(value: string | null | undefined, maxLength = MAX_NAME_LENGTH): string {
  const cleaned = (value ?? "")
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const chars = Array.from(cleaned); // by code point, so emoji are never cut in half
  return chars.length > maxLength ? chars.slice(0, maxLength - 1).join("").trimEnd() + "…" : cleaned;
}

/**
 * Replaces {{placeholders}} in ONE pass, so a product called "{{artisanName}}"
 * can't be re-expanded. Unknown placeholders are left as-is.
 */
export function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match
  );
}

export function buildAppreciationMessage(
  artisanName: string,
  productName: string,
  template: string = DEFAULT_APPRECIATION_TEMPLATE
): string {
  return renderTemplate(template, {
    artisanName: sanitizeName(artisanName) || "there",
    productName: sanitizeName(productName) || "product",
  });
}

/**
 * https://wa.me/<digits>?text=<encoded message>
 * Refuses to build a link from anything that isn't a plausible international
 * number, so a bad value can never produce a malformed or mis-targeted URL.
 */
export function buildWhatsAppUrl(digits: string, message: string): string {
  if (!/^[1-9]\d{7,14}$/.test(digits)) {
    throw new Error("Cannot build a WhatsApp link: number must be digits only in international format.");
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
