import Link from "next/link";
import { Download, Eye, Printer, QrCode, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/status-badge";
import { generateQRsForOrderAction } from "@/lib/actions/artisan-feedback";
import { qrImageUrl } from "@/lib/artisan-feedback/format";
import { getOrderQRView, listAssignableArtisans } from "@/lib/artisan-feedback/service";

// The packing-station view: an order's lines, the artisan behind each one and
// their QR — with one button to create every missing QR. Used on the order
// page and on /artisan-appreciation/new.

const linkBtn =
  "inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken";

export async function OrderQRPanel({ orderId }: { orderId: string }) {
  const [view, artisans] = await Promise.all([getOrderQRView(prisma, orderId), listAssignableArtisans(prisma)]);
  if (!view) return null;

  const missing = view.items.filter((i) => !i.activeQR && i.productId);
  const hasAnyQR = view.items.some((i) => i.activeQR);

  return (
    <section className="rounded-lg border border-border bg-surface p-5" aria-labelledby="qr-heading">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="qr-heading" className="flex items-center gap-2 text-[15px] font-medium text-ink">
            <QrCode size={16} className="text-brand" /> Artisan appreciation QR
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            Put the printed QR in the parcel. The customer scans it and can thank the artisan on WhatsApp.
          </p>
        </div>
        {hasAnyQR && (
          <Link
            href={`/print/qr/${view.order.id}`}
            target="_blank"
            className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-sunken"
          >
            <Printer size={16} /> Print QR sheet
          </Link>
        )}
      </div>

      {!view.eligible ? (
        <p className="rounded-md bg-surface-sunken px-3.5 py-2.5 text-sm text-ink-muted">
          This order was cancelled or refunded, so it doesn&apos;t get QR codes.
        </p>
      ) : (
        <ActionForm action={generateQRsForOrderAction.bind(null, view.order.id)}>
          <ul className="divide-y divide-border">
            {view.items.map((item) => (
              <li key={item.itemId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {item.productName}
                    {item.quantity > 1 && <span className="font-normal text-ink-muted"> × {item.quantity}</span>}
                  </p>

                  {!item.productId ? (
                    <p className="mt-0.5 text-xs text-bad">This line isn&apos;t linked to a product, so no artisan can be found.</p>
                  ) : item.artisan ? (
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
                      <span>
                        Made by {item.artisan.name} <span className="font-mono">({item.artisan.code})</span>
                      </span>
                      {!item.artisan.whatsappReady && (
                        <Link
                          href={`/artisans/${item.artisan.id}/edit`}
                          className="inline-flex items-center gap-1 text-warn hover:underline"
                        >
                          <TriangleAlert size={12} /> No WhatsApp number — add it
                        </Link>
                      )}
                    </p>
                  ) : !item.activeQR ? (
                    <label className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      No artisan assigned to this product. Choose one:
                      <select
                        name={`artisan_${item.itemId}`}
                        defaultValue=""
                        className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand"
                      >
                        <option value="">Select artisan…</option>
                        {artisans.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.code})
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {item.activeQR ? (
                    <>
                      <StatusBadge label="QR ready" tone="good" />
                      <a href={qrImageUrl(item.activeQR.id, "png", true)} className={linkBtn}>
                        <Download size={13} /> PNG
                      </a>
                      <a href={qrImageUrl(item.activeQR.id, "svg", true)} className={linkBtn}>
                        <Download size={13} /> SVG
                      </a>
                      <Link href={`/artisan-appreciation/${item.activeQR.id}`} className={linkBtn}>
                        <Eye size={13} /> View
                      </Link>
                    </>
                  ) : (
                    <StatusBadge label="No QR yet" tone="neutral" />
                  )}
                </div>
              </li>
            ))}
          </ul>

          {missing.length > 0 && (
            <div className="mt-4">
              <SubmitButton>
                Generate QR {missing.length === 1 ? "code" : `codes (${missing.length})`}
              </SubmitButton>
            </div>
          )}
        </ActionForm>
      )}
    </section>
  );
}
