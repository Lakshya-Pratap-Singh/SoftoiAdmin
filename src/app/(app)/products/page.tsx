import Link from "next/link";
import { Plus, Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/utils";
import { getStockStatus, STOCK_STATUS_LABEL, STOCK_STATUS_TONE } from "@/lib/stock-status";
import { ProductImport } from "@/components/products/product-import";
import { SpreadsheetExportButtons } from "@/components/ui/spreadsheet-export-buttons";
import { ProductAvatar } from "@/components/ui/product-avatar";

const PRODUCT_TYPES = ["FINISHED_PRODUCT", "RAW_MATERIAL", "COMPONENT"] as const;

function typeLabel(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    type?: string;
    stockStatus?: string;
    status?: string;
  }>;
}) {
  const { q, category, type, stockStatus, status } = await searchParams;

  const [products, categories, productSkus] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: status === "ARCHIVED" ? "ARCHIVED" : status === "ALL" ? undefined : "ACTIVE",
        ...(category ? { categoryId: category } : {}),
        ...(type ? { productType: type as never } : {}),
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
      orderBy: { createdAt: "desc" },
      include: { category: { select: { name: true } } },
    }),
    prisma.category.findMany({ where: { status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { sku: { not: null } }, select: { sku: true } }),
  ]);

  const filtered = stockStatus
    ? products.filter((p) => getStockStatus(p.currentStock, p.minimumStock) === stockStatus)
    : products;

  return (
    <div>
      <PageHeader
        title="Products"
        description="Add, edit, search, and organize every product Softoi sells."
        actions={
          <>
            <ProductImport
              categories={categories.map((category) => ({ id: category.id, name: category.name }))}
              existingSkus={productSkus.flatMap((product) => (product.sku ? [product.sku] : []))}
            />
            <SpreadsheetExportButtons
              filename="products"
              rows={filtered.map((product) => ({
                "Product Code": product.productCode,
                "Product Name": product.name,
                SKU: product.sku,
                Category: product.category?.name ?? "",
                "Product Type": typeLabel(product.productType),
                "Current Stock": product.currentStock,
                "Minimum Stock": product.minimumStock,
                "Cost Price": product.costPrice?.toString() ?? "",
                "Selling Price": product.sellingPrice?.toString() ?? "",
                Status: product.status === "ACTIVE" ? "Active" : "Archived",
              }))}
            />
            <Link
              href="/products/new"
              className="flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              <Plus size={16} /> Add Product
            </Link>
          </>
        }
      />

      <form className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search name, SKU, or code…"
          className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand"
        />
        <select
          name="category"
          defaultValue={category ?? ""}
          className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="type"
          defaultValue={type ?? ""}
          className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand"
        >
          <option value="">All types</option>
          {PRODUCT_TYPES.map((t) => (
            <option key={t} value={t}>
              {typeLabel(t)}
            </option>
          ))}
        </select>
        <select
          name="stockStatus"
          defaultValue={stockStatus ?? ""}
          className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand"
        >
          <option value="">All stock statuses</option>
          <option value="IN_STOCK">In stock</option>
          <option value="LOW_STOCK">Low stock</option>
          <option value="OUT_OF_STOCK">Out of stock</option>
        </select>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand"
        >
          <option value="">Active only</option>
          <option value="ARCHIVED">Archived only</option>
          <option value="ALL">All</option>
        </select>
        <button
          type="submit"
          className="rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-sunken"
        >
          Filter
        </button>
      </form>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products found"
          description="Try a different search or filter, or add your first product."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-sunken text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const stockStatusValue = getStockStatus(p.currentStock, p.minimumStock);
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <Link href={`/products/${p.id}`} className="flex items-center gap-3 font-medium text-ink hover:text-brand">
                        <ProductAvatar src={p.imageUrl} alt={p.name} size={32} />
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{p.productCode}</td>
                    <td className="px-4 py-3 text-ink-muted">{p.sku || "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{p.category?.name || "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{typeLabel(p.productType)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={`${p.currentStock} · ${STOCK_STATUS_LABEL[stockStatusValue]}`}
                        tone={STOCK_STATUS_TONE[stockStatusValue]}
                      />
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {p.sellingPrice ? formatCurrency(p.sellingPrice.toString()) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={p.status === "ACTIVE" ? "Active" : "Archived"}
                        tone={p.status === "ACTIVE" ? "good" : "neutral"}
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