import Link from "next/link";
import { TrendingUp, Package, IndianRupee, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { ProductAvatar } from "@/components/ui/product-avatar";
import { SpreadsheetExportButtons } from "@/components/ui/spreadsheet-export-buttons";
import { formatCurrency } from "@/lib/utils";

export default async function ProductPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;

  const dateFilter =
    from || to
      ? {
          orderDate: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
          },
        }
      : {};

  const salesByProduct = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      productId: { not: null },
      order: { status: "COMPLETED", ...dateFilter },
    },
    _sum: { quantity: true, total: true },
    _count: { _all: true },
  });

  const productIds = salesByProduct.map((r) => r.productId).filter((id): id is string => id !== null);
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          productCode: true,
          sku: true,
          imageUrl: true,
          currentStock: true,
          categoryId: true,
          category: { select: { name: true } },
          artisan: { select: { id: true, name: true, code: true } },
        },
      })
    : [];
  const productById = new Map(products.map((p) => [p.id, p]));

  const ranked = salesByProduct
    .map((row) => {
      const product = productById.get(row.productId as string);
      if (!product) return null;
      return {
        product,
        unitsSold: row._sum.quantity ?? 0,
        revenue: row._sum.total?.toString() ?? "0",
        orderLines: row._count._all,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.unitsSold - a.unitsSold);

  const totalUnits = ranked.reduce((sum, r) => sum + r.unitsSold, 0);
  const totalRevenue = ranked.reduce((sum, r) => sum + Number(r.revenue), 0);

  return (
    <div>
      <PageHeader
        title="Product Performance"
        description="Every product ranked by units sold, from completed orders."
        actions={
          <SpreadsheetExportButtons
            filename="product-performance"
            rows={ranked.map((r, i) => ({
              Rank: i + 1,
              "Product ID (PK)": r.product.id,
              "Product Code": r.product.productCode,
              "Product Name": r.product.name,
              SKU: r.product.sku ?? "",
              "Category ID (FK)": r.product.categoryId ?? "",
              Category: r.product.category?.name ?? "",
              "Artisan ID (FK)": r.product.artisan?.id ?? "",
              Artisan: r.product.artisan ? `${r.product.artisan.name} (${r.product.artisan.code})` : "",
              "Units Sold": r.unitsSold,
              Revenue: r.revenue,
              "Order Lines": r.orderLines,
              "Current Stock": r.product.currentStock,
            }))}
          />
        }
      />

      <form className="mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-ink-muted">From</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-muted">To</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-sunken"
        >
          Filter
        </button>
        {(from || to) && (
          <Link href="/reports/product-performance" className="px-2 py-2.5 text-sm text-ink-muted hover:text-ink">
            Clear
          </Link>
        )}
      </form>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Products Sold" value={String(ranked.length)} icon={Package} />
        <StatCard label="Total Units Sold" value={String(totalUnits)} icon={TrendingUp} />
        <StatCard label="Total Revenue" value={formatCurrency(String(totalRevenue))} icon={IndianRupee} />
      </div>

      {ranked.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="No sales yet"
          description="Once orders are completed, this page ranks every product by units sold."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-sunken text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Artisan</th>
                <th className="px-4 py-3 font-medium">Units Sold</th>
                <th className="px-4 py-3 font-medium">Revenue</th>
                <th className="px-4 py-3 font-medium">Current Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ranked.map((r, i) => (
                <tr key={r.product.id}>
                  <td className="px-4 py-3 text-ink-muted">
                    {i === 0 ? <Trophy size={16} className="text-warn" /> : i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/products/${r.product.id}`} className="flex items-center gap-3 font-medium text-ink hover:text-brand">
                      <ProductAvatar src={r.product.imageUrl} alt={r.product.name} size={32} />
                      {r.product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{r.product.category?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {r.product.artisan ? (
                      <Link href={`/artisans/${r.product.artisan.id}`} className="hover:text-brand">
                        {r.product.artisan.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">{r.unitsSold}</td>
                  <td className="px-4 py-3 text-ink-muted">{formatCurrency(r.revenue)}</td>
                  <td className="px-4 py-3 text-ink-muted">{r.product.currentStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}