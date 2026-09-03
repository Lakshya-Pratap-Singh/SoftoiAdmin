import Link from "next/link";
import { AlertTriangle, ArrowDownToLine } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";

export default async function LowStockPage() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });

  const lowStock = products
    .filter((p) => p.currentStock <= p.minimumStock)
    .sort((a, b) => a.currentStock - b.currentStock);

  return (
    <div>
      <PageHeader
        title="Low Stock"
        description="Products at or below their minimum stock level."
      />

      {lowStock.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="Nothing is running low"
          description="Every active product is above its minimum stock level."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-sunken text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Current Stock</th>
                <th className="px-4 py-3 font-medium">Minimum</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lowStock.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <Link href={`/products/${p.id}`} className="font-medium text-ink hover:text-brand">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">{p.currentStock}</td>
                  <td className="px-4 py-3 text-ink-muted">{p.minimumStock}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={p.currentStock === 0 ? "Out of stock" : "Low stock"}
                      tone={p.currentStock === 0 ? "bad" : "warn"}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href="/inventory/stock-in"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
                    >
                      <ArrowDownToLine size={14} /> Add Stock
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
