import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/utils";

const STATUS_TONE = {
  DRAFT: "neutral",
  COMPLETED: "good",
  CANCELLED: "bad",
  REFUNDED: "warn",
} as const;

function label(v: string) {
  return v.toLowerCase().split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string; status?: string }>;
}) {
  const { channel, status } = await searchParams;

  const orders = await prisma.order.findMany({
    where: {
      ...(channel ? { salesChannel: channel as never } : {}),
      ...(status ? { status: status as never } : {}),
    },
    orderBy: { orderDate: "desc" },
    take: 100,
    include: { customer: { select: { name: true } }, stall: { select: { name: true } } },
  });

  return (
    <div>
      <PageHeader title="Orders" description="Every order across all sales channels, in one place." />

      <form className="mb-4 flex flex-wrap gap-2">
        <select
          name="channel"
          defaultValue={channel ?? ""}
          className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand"
        >
          <option value="">All channels</option>
          {["WEBSITE", "OFFLINE_STALL", "MALL", "EXHIBITION", "POPUP_STORE", "INSTAGRAM", "MANUAL_ORDER", "OTHER"].map(
            (c) => (
              <option key={c} value={c}>
                {label(c)}
              </option>
            )
          )}
        </select>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-md border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand"
        >
          <option value="">All statuses</option>
          {["DRAFT", "COMPLETED", "CANCELLED", "REFUNDED"].map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-sunken">
          Filter
        </button>
      </form>

      {orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No orders found" description="Orders created here or through POS will show up in this list." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-sunken text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Channel</th>
                <th className="px-4 py-3 font-medium">Stall</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3">
                    <Link href={`/orders/${o.id}`} className="font-medium text-ink hover:text-brand">
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{o.customer?.name || "Walk-in"}</td>
                  <td className="px-4 py-3 text-ink-muted">{label(o.salesChannel)}</td>
                  <td className="px-4 py-3 text-ink-muted">{o.stall?.name || "—"}</td>
                  <td className="px-4 py-3 font-medium text-ink">{formatCurrency(o.total.toString())}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={label(o.status)} tone={STATUS_TONE[o.status]} />
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {o.orderDate.toLocaleDateString("en-IN", { dateStyle: "medium" })}
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
