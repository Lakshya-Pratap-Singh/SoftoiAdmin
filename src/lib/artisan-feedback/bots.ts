// Crawlers and link-preview fetchers shouldn't inflate "QR scanned".
// Deliberately conservative: we do NOT exclude WhatsApp/in-app browsers,
// because a real customer may well be inside one.
const BOT_PATTERN = /bot\b|crawl|spider|slurp|preview|facebookexternalhit|headless|curl\/|wget\/|python-requests|httpclient/i;

export function isLikelyBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true; // real browsers always send one
  return BOT_PATTERN.test(userAgent);
}
