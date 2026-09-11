import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Archive, RotateCcw, Package, Boxes, IndianRupee, ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductAvatar } from "@/components/ui/product-avatar";
import { ProductAssignmentPanel } from "@/components/artisans/product-assignment-panel";
import { formatCurrency } from "@/lib/utils";
import { ARTISAN_TYPE_LABEL } from "@/lib/artisan-type";
import { archiveArtisan, restoreArtisan } from "@/lib/actions/artisans";

export default async function ArtisanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const artisan = await prisma.artisan.findUnique({
    where: { id },
    include: {
      products: {
        orderBy: { name: "asc" },
        include: { category: { select: { name: true } } },
      },
    },
  });
  if (!artisan) notFound();

  const salesByProduct = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      productId: { in: artisan.products.map((p) => p.id) },
      order: { status: "COMPLETED" },
    },
    _sum: { quantity: true, total: true },
  });
  const salesMap = new Map(
    salesByProduct.map((row) => [row.productId, { units: row._sum.quantity ?? 0, sales: row._sum.total?.toString() ?? "0" }])
  );

  const allProducts = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      sku: true,
      imageUrl: true,
      artisanId: true,
      artisan: { select: { name: true } },
    },
  });
  const assignableProducts = allProducts.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    imageUrl: p.imageUrl,
    artisanId: p.artisanId,
    artisanName: p.artisan?.name ?? null,
  }));

  const totalStock = artisan.products.reduce((sum, p) => sum + p.currentStock, 0);
  const netSales = salesByProduct.reduce((sum, row) => sum + Number(row._sum.total ?? 0), 0);
  const unitsSold = salesByProduct.reduce((sum, row) => sum + (row._sum.quantity ?? 0), 0);

  return (
    <div>
      <PageHeader
        title={artisan.name}
        description={`${artisan.code} · ${ARTISAN_TYPE_LABEL[artisan.type] ?? artisan.type}`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/artisans/${artisan.id}/edit`}
              className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-sunken"
            >
              <Pencil size={16} /> Edit
            </Link>
            {artisan.status === "ACTIVE" ? (
              <form action={archiveArtisan.bind(null, artisan.id)}>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-bad hover:bg-bad-tint"
                >
                  <Archive size={16} /> Archive
                </button>
              </form>
            ) : (
              <form action={restoreArtisan.bind(null, artisan.id)}>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-good hover:bg-good-tint"
                >
                  <RotateCcw size={16} /> Restore
                </button>
              </form>
            )}
          </div>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <StatusBadge label={artisan.status === "ACTIVE" ? "Active" : "Archived"} tone={artisan.status === "ACTIVE" ? "good" : "neutral"} />
        {artisan.phone && <span className="text-sm text-ink-muted">{artisan.phone}</span>}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Products Assigned" value={String(artisan.products.length)} icon={Package} />
        <StatCard label="Total Stock" value={String(totalStock)} icon={Boxes} />
        <StatCard label="Net Sales" value={formatCurrency(String(netSales))} icon={IndianRupee} />
        <StatCard label="Units Sold" value={String(unitsSold)} icon={ShoppingBag} />
      </div>

      {artisan.notes && (
        <div className="mb-6 rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium text-ink-muted">Notes</p>
          <p className="mt-1 text-sm text-ink">{artisan.notes}</p>
        </div>
      )}

      <h2 className="mb-3 text-[15px] font-medium text-ink">Assigned Products</h2>
      {artisan.products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products assigned"
          description="Link this artisan from a product's edit page to see it here."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-sunken text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Selling Price</th>
                <th className="px-4 py-3 font-medium">Current Stock</th>
                <th className="px-4 py-3 font-medium">Units Sold</th>
                <th className="px-4 py-3 font-medium">Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {artisan.products.map((p) => {
                const sales = salesMap.get(p.id);
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <Link href={`/products/${p.id}`} className="flex items-center gap-3 font-medium text-ink hover:text-brand">
                        <ProductAvatar src={p.imageUrl} alt={p.name} size={32} />
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{p.category?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{p.sellingPrice ? formatCurrency(p.sellingPrice.toString()) : "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{p.currentStock}</td>
                    <td className="px-4 py-3 text-ink-muted">{sales?.units ?? 0}</td>
                    <td className="px-4 py-3 text-ink-muted">{formatCurrency(sales?.sales ?? "0")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ProductAssignmentPanel artisanId={artisan.id} artisanName={artisan.name} products={assignableProducts} />
    </div>
  );
}