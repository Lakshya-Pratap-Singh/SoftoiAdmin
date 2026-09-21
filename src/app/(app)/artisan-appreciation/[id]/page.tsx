import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, Download, ExternalLink, RefreshCw, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { ActionForm } from "@/components/ui/action-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmSubmitButton } from "@/components/artisan-feedback/confirm-button";
import { disableQRAction, regenerateQRAction } from "@/lib/actions/artisan-feedback";
import { assertPageAccess } from "@/lib/artisan-feedback/page-access";
import { buildFeedbackUrl } from "@/lib/artisan-feedback/config";
import { QR_STATUS_LABEL, QR_STATUS_TONE, formatDateTime, qrImageUrl } from "@/lib/artisan-feedback/format";
import { getQRDetail, isWhatsappReady, qrReference } from "@/lib/artisan-feedback/service";

const btn = "flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium hover:bg-surface-sunken";

export default async function QRDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await assertPageAccess();
  const { id } = await params;
  const qr = await getQRDetail(prisma, id);
  if (!qr) notFound();

  const active = qr.status === "ACTIVE";
  let publicUrl: string | null = null;
  let configError: string | null = null;
  try {
    publicUrl = buildFeedbackUrl(qr.token);
  } catch (err) {
    configError = err instanceof Error ? err.message : "APP_BASE_URL is not configured.";
  }
  const whatsappReady = isWhatsappReady(qr.artisan);
  const replacedBy = qr.regeneratedTo[0];

  return (
    <div>
      <PageHeader
        title={qrReference(qr.id)}
        description={`${qr.product.name} · ${qr.artisan.name}`}
        actions={
          <>
            <StatusBadge label={QR_STATUS_LABEL[qr.status]} tone={QR_STATUS_TONE[qr.status]} />
            <Link href="/artisan-appreciation" className={`${btn} text-ink`}>
              All QR codes
            </Link>
          </>
        }
      />

      {configError && (
        <p role="alert" className="mb-4 rounded-md bg-bad-tint px-3.5 py-2.5 text-sm text-bad">
          {configError}
        </p>
      )}
      {active && !whatsappReady && (
        <p className="mb-4 flex flex-wrap items-center gap-2 rounded-md bg-warn-tint px-3.5 py-2.5 text-sm text-warn">
          <TriangleAlert size={16} />
          {qr.artisan.name} has no usable WhatsApp number, so scans currently show &ldquo;temporarily unavailable&rdquo;.
          <Link href={`/artisans/${qr.artisan.id}/edit`} className="font-medium underline">Add a number</Link>
          — printed QR codes will start working straight away.
        </p>
      )}
      {!active && (
        <p className="mb-4 rounded-md bg-surface-sunken px-3.5 py-2.5 text-sm text-ink-muted">
          This QR is {qr.status === "DISABLED" ? "disabled" : "expired"} and no longer opens WhatsApp.
          {replacedBy && (
            <>
              {" "}It was replaced by <Link href={`/artisan-appreciation/${replacedBy.id}`} className="font-medium text-brand hover:underline">{qrReference(replacedBy.id)}</Link>.
            </>
          )}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-5">
          <div className={`mx-auto w-full max-w-64 rounded-md border border-border bg-white p-2 ${active ? "" : "opacity-40 grayscale"}`}>
            {active ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrImageUrl(qr.id, "png")} alt={`QR code ${qrReference(qr.id)}`} className="h-auto w-full" />
            ) : (
              <div className="flex aspect-square items-center justify-center text-sm text-ink-muted">Not available</div>
            )}
          </div>
          {active && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <a href={qrImageUrl(qr.id, "png", true)} className={`${btn} text-ink`}>
                <Download size={16} /> PNG
              </a>
              <a href={qrImageUrl(qr.id, "svg", true)} className={`${btn} text-ink`}>
                <Download size={16} /> SVG
              </a>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-surface p-5 lg:col-span-2">
          <h2 className="mb-3 text-[15px] font-medium text-ink">Details</h2>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Row label="Order">
              {qr.order ? <Link href={`/orders/${qr.order.id}`} className="text-brand hover:underline">{qr.order.orderNumber}</Link> : "—"}
            </Row>
            <Row label="Product">{qr.product.name}</Row>
            <Row label="Artisan">
              <Link href={`/artisans/${qr.artisan.id}`} className="text-brand hover:underline">{qr.artisan.name}</Link>{" "}
              <span className="font-mono text-xs text-ink-faint">{qr.artisan.code}</span>
            </Row>
            <Row label="Created">{formatDateTime(qr.createdAt)}{qr.createdBy ? ` by ${qr.createdBy.name}` : ""}</Row>
            <Row label="QR scanned">{qr.scanCount}</Row>
            <Row label="WhatsApp opened">{qr.whatsappOpenCount}</Row>
            <Row label="First scanned">{formatDateTime(qr.firstScannedAt)}</Row>
            <Row label="Last scanned">{formatDateTime(qr.lastScannedAt)}</Row>
            {qr.disabledAt && <Row label="Disabled">{formatDateTime(qr.disabledAt)}</Row>}
            {qr.regeneratedFrom && (
              <Row label="Replaces">
                <Link href={`/artisan-appreciation/${qr.regeneratedFrom.id}`} className="text-brand hover:underline">
                  {qrReference(qr.regeneratedFrom.id)}
                </Link>
              </Row>
            )}
          </dl>

          {publicUrl && (
            <div className="mt-5">
              <p className="text-xs font-medium text-ink-muted">Link inside the QR</p>
              <p className="mt-1 flex items-center gap-2 break-all rounded-md bg-surface-sunken px-3 py-2 font-mono text-xs text-ink">
                {publicUrl}
              </p>
              {active && (
                <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-brand hover:underline">
                  <ExternalLink size={12} /> Open the customer page (test scans are counted)
                </a>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
            <ActionForm action={regenerateQRAction.bind(null, qr.id)}>
              <ConfirmSubmitButton
                className={`${btn} text-ink`}
                message="Replace this QR with a new one? The current QR will stop working — any copies already printed will show as inactive."
              >
                <RefreshCw size={16} /> Regenerate
              </ConfirmSubmitButton>
            </ActionForm>
            {active && (
              <ActionForm action={disableQRAction.bind(null, qr.id)}>
                <ConfirmSubmitButton
                  className={`${btn} text-bad hover:bg-bad-tint`}
                  message="Disable this QR? Customers who scan it will see that the link is no longer active. This can't be undone (you can regenerate a new one)."
                >
                  <Ban size={16} /> Disable
                </ConfirmSubmitButton>
              </ActionForm>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-ink">{children}</dd>
    </div>
  );
}
