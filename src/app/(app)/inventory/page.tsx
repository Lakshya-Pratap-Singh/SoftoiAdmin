import Link from "next/link";
import { Boxes } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { getStockStatus, STOCK_STATUS_LABEL, STOCK_STATUS_TONE } from "@/lib/stock-status";
import { SpreadsheetExportButtons } from "@/components/ui/spreadsheet-export-buttons";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { productCode: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    include: { category: { select: { name: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="A central view of current stock across every product."
        actions={<SpreadsheetExportButtons filename="inventory" rows={products.map((product) => ({
          "Product Code": product.productCode,
          "Product Name": product.name,
          SKU: product.sku,
          Category: product.category?.name ?? "",
          "Current Stock": product.currentStock,
          "Minimum Stock": product.minimumStock,
          "Stock Status": STOCK_STATUS_LABEL[getStockStatus(product.currentStock, product.minimumStock)],
        }))} />}
      />

      <form className="mb-4">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by name, SKU, or product code…"
          className="w-full max-w-sm rounded-md border border-border bg-surface px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-brand md:w-80"
        />
      </form>

      {products.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No products found"
          description={q ? "Try a different search." : "Add a product to see it here."}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-sunken text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Current Stock</th>
                <th className="px-4 py-3 font-medium">Minimum</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => {
                const status = getStockStatus(p.currentStock, p.minimumStock);
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <Link href={`/products/${p.id}`} className="font-medium text-ink hover:text-brand">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{p.sku || "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{p.category?.name || "—"}</td>
                    <td className="px-4 py-3 font-medium text-ink">{p.currentStock}</td>
                    <td className="px-4 py-3 text-ink-muted">{p.minimumStock}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={STOCK_STATUS_LABEL[status]}
                        tone={STOCK_STATUS_TONE[status]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
