import Link from "next/link";
import { Download, Eye, Plus, QrCode, ScanLine, MessageCircle, Send, Layers, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { assertPageAccess } from "@/lib/artisan-feedback/page-access";
import { QR_STATUS_LABEL, QR_STATUS_TONE, formatDateTime, qrImageUrl } from "@/lib/artisan-feedback/format";
import { getStats, isWhatsappReady, listQRs, qrReference } from "@/lib/artisan-feedback/service";

const STATUSES = ["ACTIVE", "DISABLED", "EXPIRED"] as const;

export default async function ArtisanAppreciationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await assertPageAccess();
  const { status } = await searchParams;
  const statusFilter = STATUSES.find((s) => s === status);

  const [stats, qrs] = await Promise.all([getStats(prisma), listQRs(prisma, { status: statusFilter })]);

  return (
    <div>
      <PageHeader
        title="Artisan Appreciation"
        description="QR codes that let customers thank the artisan who made their product, on WhatsApp."
        actions={
          <Link
            href="/artisan-appreciation/new"
            className="flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus size={16} /> Generate QR
          </Link>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total QR codes" value={String(stats.totalQRs)} icon={QrCode} />
        <StatCard label="Active QR codes" value={String(stats.activeQRs)} icon={Layers} tone="good" />
        <StatCard label="QR scanned" value={String(stats.totalScans)} icon={ScanLine} />
        <StatCard label="WhatsApp opened" value={String(stats.totalWhatsappOpens)} icon={MessageCircle} />
        <StatCard label="Message sent" value="Not tracked" icon={Send} tone="warn" />
      </div>
      <p className="mb-6 max-w-3xl text-xs leading-relaxed text-ink-faint">
        <strong className="font-medium text-ink-muted">QR scanned</strong> counts page opens (search-engine and link-preview bots excluded).{" "}
        <strong className="font-medium text-ink-muted">WhatsApp opened</strong> counts taps on the WhatsApp button.{" "}
        Whether the customer then pressed Send can&apos;t be known with a WhatsApp link, so it is never counted.
      </p>

      {(stats.topProducts.length > 0 || stats.topArtisans.length > 0) && (
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <RankCard
            title="Most scanned products"
            rows={stats.topProducts.map((p) => ({ key: p.productId, label: p.name, scans: p.scans }))}
          />
          <RankCard
            title="Most appreciated artisans"
            hint="ranked by QR scans"
            rows={stats.topArtisans.map((a) => ({ key: a.artisanId, label: a.name, sub: a.code, scans: a.scans }))}
          />
        </div>
      )}

      <form className="mb-4 flex flex-wrap gap-2">
        <select
          name="status"
          defaultValue={statusFilter ?? ""}
          aria-label="Filter by status"
          className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {QR_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-sunken">
          Filter
        </button>
      </form>

      {qrs.length === 0 ? (
        <EmptyState
          icon={QrCode}
          title={statusFilter ? "No QR codes with this status" : "No QR codes yet"}
          description="Open an order and press Generate QR codes, or start from Generate QR."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-sunken text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">QR ID</th>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Artisan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Scans</th>
                <th className="px-4 py-3 font-medium">WhatsApp opens</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Last scanned</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {qrs.map((q) => (
                <tr key={q.id}>
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link href={`/artisan-appreciation/${q.id}`} className="text-ink hover:text-brand">
                      {qrReference(q.id)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {q.order ? (
                      <Link href={`/orders/${q.order.id}`} className="text-ink hover:text-brand">
                        {q.order.orderNumber}
                      </Link>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink">{q.product.name}</td>
                  <td className="px-4 py-3">
                    <p className="text-ink">{q.artisan.name}</p>
                    {q.status === "ACTIVE" && !isWhatsappReady(q.artisan) && (
                      <Link href={`/artisans/${q.artisan.id}/edit`} className="mt-0.5 inline-flex items-center gap-1 text-xs text-warn hover:underline">
                        <TriangleAlert size={12} /> No WhatsApp number
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge label={QR_STATUS_LABEL[q.status]} tone={QR_STATUS_TONE[q.status]} />
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{q.scanCount}</td>
                  <td className="px-4 py-3 text-ink-muted">{q.whatsappOpenCount}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{formatDateTime(q.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{formatDateTime(q.lastScannedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {q.status === "ACTIVE" && (
                        <a
                          href={qrImageUrl(q.id, "png", true)}
                          className="rounded-md p-2 text-ink-muted hover:bg-surface-sunken hover:text-ink"
                          aria-label={`Download PNG for ${qrReference(q.id)}`}
                          title="Download PNG"
                        >
                          <Download size={16} />
                        </a>
                      )}
                      <Link
                        href={`/artisan-appreciation/${q.id}`}
                        className="rounded-md p-2 text-ink-muted hover:bg-surface-sunken hover:text-ink"
                        aria-label={`View ${qrReference(q.id)}`}
                        title="View"
                      >
                        <Eye size={16} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {qrs.length >= 200 && <p className="mt-3 text-xs text-ink-faint">Showing the 200 most recent QR codes.</p>}
    </div>
  );
}

function RankCard({
  title,
  hint,
  rows,
}: {
  title: string;
  hint?: string;
  rows: Array<{ key: string; label: string; sub?: string; scans: number }>;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <h2 className="mb-3 text-[15px] font-medium text-ink">
        {title} {hint && <span className="text-xs font-normal text-ink-faint">— {hint}</span>}
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted">No scans yet.</p>
      ) : (
        <ol className="flex flex-col gap-2 text-sm">
          {rows.map((r) => (
            <li key={r.key} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-ink">
                {r.label} {r.sub && <span className="font-mono text-xs text-ink-faint">{r.sub}</span>}
              </span>
              <span className="shrink-0 text-ink-muted">{r.scans} {r.scans === 1 ? "scan" : "scans"}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
