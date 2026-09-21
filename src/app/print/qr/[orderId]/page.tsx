import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/artisan-feedback/print-button";
import { AccessError } from "@/lib/artisan-feedback/access";
import { qrImageUrl } from "@/lib/artisan-feedback/format";
import { requireQRManager } from "@/lib/artisan-feedback/session";

// Print sheet for the packing station: every active QR of one order, one card
// each, sized to cut out and drop in the parcel. Lives outside the (app)
// group so there is no sidebar in the way; it does its own sign-in check.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Print QR codes — Softoi", robots: { index: false, follow: false } };

export default async function PrintQRPage({ params }: { params: Promise<{ orderId: string }> }) {
  try {
    await requireQRManager();
  } catch (err) {
    if (err instanceof AccessError) {
      if (err.status === 401) redirect("/login");
      notFound();
    }
    throw err;
  }

  const { orderId } = await params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(orderId)) notFound();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      orderNumber: true,
      feedbackQRs: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: { id: true, product: { select: { name: true } } },
      },
    },
  });
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 print:max-w-none print:p-0">
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-ink">QR sheet — {order.orderNumber}</h1>
          <p className="mt-1 text-sm text-ink-muted">Print, cut along the dashed lines and put one card in each parcel.</p>
        </div>
        <PrintButton />
      </div>

      {order.feedbackQRs.length === 0 ? (
        <p className="rounded-md bg-surface-sunken px-4 py-3 text-sm text-ink-muted">
          No active QR codes for this order yet. Generate them from the order page first.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 print:gap-3">
          {order.feedbackQRs.map((qr) => (
            <li
              key={qr.id}
              className="break-inside-avoid rounded-lg border-2 border-dashed border-ink-faint p-4 text-center"
              style={{ breakInside: "avoid" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrImageUrl(qr.id, "png")} alt="" className="mx-auto h-40 w-40" />
              <p className="mt-2 font-display text-lg font-medium leading-snug text-brand-ink">Thank the artisan 💜</p>
              <p className="mt-1 text-xs leading-snug text-ink-muted">
                Scan to send a little appreciation to the person who made your {qr.product.name}.
              </p>
              <p className="mt-2 font-display text-sm italic text-brand-ink">Softoi</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
