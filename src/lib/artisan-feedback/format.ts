// Display helpers for the admin screens. Times are shown in India Standard
// Time regardless of where the server runs (Vercel servers are on UTC).
const IST = "Asia/Kolkata";

export function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: IST });
}

export function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: IST });
}

export const QR_STATUS_TONE = { ACTIVE: "good", DISABLED: "bad", EXPIRED: "warn" } as const;
export const QR_STATUS_LABEL = { ACTIVE: "Active", DISABLED: "Disabled", EXPIRED: "Expired" } as const;

export function qrImageUrl(id: string, format: "png" | "svg", download = false): string {
  return `/api/admin/artisan-feedback/qr/${id}/image?format=${format}${download ? "&download=1" : ""}`;
}
