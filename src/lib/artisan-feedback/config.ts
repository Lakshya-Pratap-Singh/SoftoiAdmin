// Where QR codes point. Read from APP_BASE_URL rather than hardcoded, so the
// same code works locally, in preview deployments and in production.

export function getAppBaseUrl(env: Record<string, string | undefined> = process.env): string {
  const raw = env.APP_BASE_URL?.trim();

  if (!raw) {
    // A QR printed with a localhost address is a silent, expensive mistake
    // (it looks fine on screen and is dead on the package) — fail loudly.
    if (env.NODE_ENV === "production") {
      throw new Error(
        "APP_BASE_URL is not set. Set it to your public URL (e.g. https://inventory.softoi.shop) before generating QR codes."
      );
    }
    return "http://localhost:3000";
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`APP_BASE_URL is not a valid URL: "${raw}"`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("APP_BASE_URL must start with https:// (or http:// for local development).");
  }
  if (env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("APP_BASE_URL must use https:// in production.");
  }
  return url.origin; // drops any trailing slash / path
}

export function buildFeedbackUrl(token: string, baseUrl: string = getAppBaseUrl()): string {
  return `${baseUrl}/feedback/${token}`;
}
