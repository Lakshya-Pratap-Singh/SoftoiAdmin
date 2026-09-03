import { notFound } from "next/navigation";
import { XCircle, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/utils";
import { cancelOrder } from "@/lib/actions/orders";

const STATUS_TONE = {
  DRAFT: "neutral",
  COMPLETED: "good",
  CANCELLED: "bad",
  REFUNDED: "warn",
} as const;

function label(v: string) {
  return v.toLowerCase().split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      customer: true,
      stall: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
  if (!order) notFound();

  return (
    <div>
      <PageHeader
        title={order.orderNumber}
        description={order.orderDate.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
        actions={
          <>
            <StatusBadge label={label(order.status)} tone={STATUS_TONE[order.status]} />
            {order.status === "COMPLETED" && (
              <form action={cancelOrder.bind(null, order.id)}>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-bad hover:bg-bad-tint"
                >
                  <XCircle size={16} /> Cancel Order
                </button>
              </form>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-surface p-5 lg:col-span-2">
          <h2 className="mb-3 text-[15px] font-medium text-ink">Items</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-ink-muted">
              <tr>
                <th className="py-2 font-medium">Product</th>
                <th className="py-2 font-medium">Qty</th>
                <th className="py-2 font-medium">Unit Price</th>
                <th className="py-2 font-medium">Discount</th>
                <th className="py-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-2.5">
                    <p className="font-medium text-ink">{item.productNameSnapshot}</p>
                    {item.skuSnapshot && <p className="text-xs text-ink-faint">{item.skuSnapshot}</p>}
                  </td>
                  <td className="py-2.5 text-ink-muted">{item.quantity}</td>
                  <td className="py-2.5 text-ink-muted">{formatCurrency(item.unitPrice.toString())}</td>
                  <td className="py-2.5 text-ink-muted">{formatCurrency(item.discount.toString())}</td>
                  <td className="py-2.5 text-right font-medium text-ink">{formatCurrency(item.total.toString())}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex flex-col items-end gap-1 border-t border-border pt-4 text-sm">
            <div className="flex w-48 justify-between text-ink-muted">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal.toString())}</span>
            </div>
            <div className="flex w-48 justify-between text-ink-muted">
              <span>Discount</span>
              <span>-{formatCurrency(order.discount.toString())}</span>
            </div>
            <div className="flex w-48 justify-between text-base font-semibold text-ink">
              <span>Total</span>
              <span>{formatCurrency(order.total.toString())}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-5">
          <h2 className="mb-3 text-[15px] font-medium text-ink">Details</h2>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Customer</dt>
              <dd className="text-ink">{order.customer?.name || "Walk-in"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Sales channel</dt>
              <dd className="text-ink">{label(order.salesChannel)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Stall</dt>
              <dd className="text-ink">{order.stall?.name || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Payment</dt>
              <dd className="flex items-center gap-1 text-ink">
                <CheckCircle2 size={14} className="text-good" />
                {order.paymentMethod ? label(order.paymentMethod) : "—"} · {label(order.paymentStatus)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Created by</dt>
              <dd className="text-ink">{order.createdBy?.name || "—"}</dd>
            </div>
            {order.notes && (
              <div>
                <dt className="text-ink-muted">Notes</dt>
                <dd className="mt-1 text-ink">{order.notes}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
