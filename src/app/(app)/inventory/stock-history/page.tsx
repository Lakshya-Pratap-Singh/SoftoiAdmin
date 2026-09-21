import Link from "next/link";
import { History } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SpreadsheetExportButtons } from "@/components/ui/spreadsheet-export-buttons";

const MOVEMENT_TYPES = [
  "INITIAL_STOCK",
  "STOCK_IN",
  "STOCK_OUT",
  "STOCK_ADJUSTMENT",
  "POS_SALE",
  "ONLINE_ORDER",
  "ORDER_CANCELLATION",
  "STOCK_RESTORATION",
  "COMPONENT_CONSUMED",
] as const;

function movementLabel(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function StockHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; from?: string; to?: string }>;
}) {
  const { q, type, from, to } = await searchParams;

  const movements = await prisma.stockMovement.findMany({
    where: {
      ...(type ? { movementType: type as never } : {}),
      ...(q
        ? {
            product: {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { sku: { contains: q, mode: "insensitive" } },
                { productCode: { contains: q, mode: "insensitive" } },
              ],
            },
          }
        : {}),
      ...(from || to
        ? {
            movementDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
            },
          }
        : {}),
    },
    orderBy: { movementDate: "desc" },
    take: 200,
    include: {
      product: {
        select: { name: true, sku: true, productCode: true, category: { select: { name: true } } },
      },
      createdBy: { select: { name: true } },
    },
  });

  // referenceId is a loose reference (no FK), so resolve it to a real
  // order number with a separate lookup rather than a Prisma include.
  const orderIds = Array.from(
    new Set(movements.filter((m) => m.referenceType === "ORDER" && m.referenceId).map((m) => m.referenceId as string))
  );
  const orders = orderIds.length
    ? await prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNumber: true } })
    : [];
  const orderNumberById = new Map(orders.map((o) => [o.id, o.orderNumber]));

  return (
    <div>
      <PageHeader
        title="Stock History"
        description="A complete, permanent record of every stock movement."
        actions={<SpreadsheetExportButtons filename="stock-history" rows={movements.map((movement) => ({
          Date: movement.movementDate.toISOString(),
          "Product Code": movement.product.productCode,
          Product: movement.product.name,
          SKU: movement.product.sku ?? "",
          Category: movement.product.category?.name ?? "",
          Type: movementLabel(movement.movementType),
          Quantity: movement.quantity,
          "Previous Quantity": movement.previousQuantity,
          "New Quantity": movement.newQuantity,
          "Order Number": movement.referenceType === "ORDER" ? orderNumberById.get(movement.referenceId ?? "") ?? "" : "",
          Reason: movement.reason,
          Notes: movement.notes ?? "",
          "Created By": movement.createdBy?.name ?? "",
        }))} />}
      />

      <form className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search product…"
          className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand"
        />
        <select
          name="type"
          defaultValue={type ?? ""}
          className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand"
        >
          <option value="">All movement types</option>
          {MOVEMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {movementLabel(t)}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand"
        />
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand"
        />
        <button
          type="submit"
          className="rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-sunken"
        >
          Filter
        </button>
      </form>

      {movements.length === 0 ? (
        <EmptyState
          icon={History}
          title="No stock movements found"
          description="Adjust your filters, or record a stock change to see it here."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-sunken text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Quantity</th>
                <th className="px-4 py-3 font-medium">Prev → New</th>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movements.map((m) => {
                const orderNumber = m.referenceType === "ORDER" ? orderNumberById.get(m.referenceId ?? "") : undefined;
                return (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                      {m.movementDate.toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">{m.product.name}</td>
                    <td className="px-4 py-3 text-ink-muted">{movementLabel(m.movementType)}</td>
                    <td
                      className={`px-4 py-3 font-medium ${
                        m.quantity > 0 ? "text-good" : m.quantity < 0 ? "text-bad" : "text-ink-muted"
                      }`}
                    >
                      {m.quantity > 0 ? "+" : ""}
                      {m.quantity}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {m.previousQuantity} → {m.newQuantity}
                    </td>
                    <td className="px-4 py-3">
                      {orderNumber ? (
                        <Link href={`/orders/${m.referenceId}`} className="text-brand hover:underline">
                          {orderNumber}
                        </Link>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{m.reason}</td>
                    <td className="px-4 py-3 text-ink-muted">{m.createdBy?.name || "—"}</td>
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