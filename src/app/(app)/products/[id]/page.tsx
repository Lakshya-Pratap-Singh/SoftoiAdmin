import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Archive, RotateCcw, ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/utils";
import { getStockStatus, STOCK_STATUS_LABEL, STOCK_STATUS_TONE } from "@/lib/stock-status";
import { archiveProduct, restoreProduct } from "@/lib/actions/products";

function typeLabel(type: string) {
  return type.toLowerCase().split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { name: true } },
      stockMovements: { orderBy: { movementDate: "desc" }, take: 10 },
    },
  });
  if (!product) notFound();

  const status = getStockStatus(product.currentStock, product.minimumStock);

  return (
    <div>
      <PageHeader
        title={product.name}
        description={`${product.productCode}${product.sku ? ` · ${product.sku}` : ""}`}
        actions={
          <>
            <Link
              href={`/products/${product.id}/edit`}
              className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-sunken"
            >
              <Pencil size={16} /> Edit
            </Link>
            {product.status === "ACTIVE" ? (
              <form action={archiveProduct.bind(null, product.id)}>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-bad hover:bg-bad-tint"
                >
                  <Archive size={16} /> Archive
                </button>
              </form>
            ) : (
              <form action={restoreProduct.bind(null, product.id)}>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-good hover:bg-good-tint"
                >
                  <RotateCcw size={16} /> Restore
                </button>
              </form>
            )}
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Link href="/inventory/stock-in" className="flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">
          <ArrowDownToLine size={16} /> Add Stock
        </Link>
        <Link href="/inventory/stock-out" className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-sunken">
          <ArrowUpFromLine size={16} /> Remove Stock
        </Link>
        <Link href="/inventory/stock-adjustment" className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-sunken">
          <SlidersHorizontal size={16} /> Adjust Stock
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-5 lg:col-span-2">
          <h2 className="mb-3 text-[15px] font-medium text-ink">Basic information</h2>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-ink-muted">Category</dt>
            <dd className="text-ink">{product.category?.name || "—"}</dd>
            <dt className="text-ink-muted">Product type</dt>
            <dd className="text-ink">{typeLabel(product.productType)}</dd>
            <dt className="text-ink-muted">Description</dt>
            <dd className="text-ink">{product.description || "—"}</dd>
            <dt className="text-ink-muted">Notes</dt>
            <dd className="text-ink">{product.notes || "—"}</dd>
          </dl>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5">
          <h2 className="mb-3 text-[15px] font-medium text-ink">Inventory</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-ink-muted">Current stock</dt>
              <dd className="font-medium text-ink">{product.currentStock}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-muted">Minimum stock</dt>
              <dd className="text-ink">{product.minimumStock}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-muted">Status</dt>
              <dd>
                <StatusBadge label={STOCK_STATUS_LABEL[status]} tone={STOCK_STATUS_TONE[status]} />
              </dd>
            </div>
          </dl>

          <h2 className="mb-3 mt-6 text-[15px] font-medium text-ink">Pricing</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-ink-muted">Cost price</dt>
              <dd className="text-ink">{product.costPrice ? formatCurrency(product.costPrice.toString()) : "—"}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-muted">Selling price</dt>
              <dd className="text-ink">{product.sellingPrice ? formatCurrency(product.sellingPrice.toString()) : "—"}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-3 text-[15px] font-medium text-ink">Product history</h2>
        {product.stockMovements.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-muted">No stock movements yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {product.stockMovements.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium text-ink">{m.reason}</p>
                  <p className="text-xs text-ink-muted">
                    {m.movementDate.toLocaleDateString("en-IN", { dateStyle: "medium" })}
                  </p>
                </div>
                <span className={m.quantity > 0 ? "text-good" : "text-bad"}>
                  {m.quantity > 0 ? "+" : ""}
                  {m.quantity}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
