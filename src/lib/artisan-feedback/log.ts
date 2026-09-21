// Structured logging for failed / unusual QR resolutions, so an admin can
// find out why a customer hit a dead end. Goes to stdout/stderr like the rest
// of the app (`npm run dev` terminal, or Vercel → Logs) and searches on the
// "[artisan-feedback]" prefix.
//
// Never logs a full token for unknown scans, and never logs customer data
// (the public flow doesn't have any).

import { tokenPrefix } from "./token";

export type ResolveIssue = "invalid_token" | "disabled" | "expired" | "no_whatsapp" | "invalid_whatsapp";

export function logResolveIssue(
  issue: ResolveIssue,
  ctx: { token: string; qrId?: string; artisanCode?: string }
) {
  const entry = {
    issue,
    tokenPrefix: tokenPrefix(ctx.token),
    ...(ctx.qrId ? { qrId: ctx.qrId } : {}),
    ...(ctx.artisanCode ? { artisanCode: ctx.artisanCode } : {}),
  };
  // no_whatsapp / invalid_whatsapp need an admin to act (fix the artisan's
  // number), so they are errors; the rest are expected noise.
  if (issue === "no_whatsapp" || issue === "invalid_whatsapp") {
    console.error(
      `[artisan-feedback] scan hit a dead end — artisan ${ctx.artisanCode ?? "?"} has no usable WhatsApp number. Add one on the artisan's edit page.`,
      entry
    );
  } else {
    console.warn("[artisan-feedback] scan not served", entry);
  }
}
