import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderQRPanel } from "@/components/artisan-feedback/order-qr-panel";
import { assertPageAccess } from "@/lib/artisan-feedback/page-access";
import { formatDate } from "@/lib/artisan-feedback/format";
import { listOrdersForPicker } from "@/lib/artisan-feedback/service";

// Pick an order → see its lines with the artisan already filled in → generate.
// Nothing about the order, product or artisan is typed by hand.
export default async function GenerateQRPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  await assertPageAccess();
  const { orderId } = await searchParams;

  if (orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, orderNumber: true } });
    return (
      <div>
        <PageHeader
          title={`Generate QR — ${order?.orderNumber ?? "order not found"}`}
          description="Each line already knows its product and artisan."
          actions={
            <Link href="/artisan-appreciation/new" className="rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-sunken">
              Pick another order
            </Link>
          }
        />
        {order ? (
          <OrderQRPanel orderId={order.id} />
        ) : (
          <EmptyState icon={ClipboardList} title="Order not found" description="It may have been removed. Pick another order." />
        )}
      </div>
    );
  }

  const orders = await listOrdersForPicker(prisma);
  return (
    <div>
      <PageHeader title="Generate QR" description="Choose the order you're packing." />
      {orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No orders yet" description="Orders created in POS will show up here." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-sunken text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-medium text-ink">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-ink-muted">{o.customer?.name || "Walk-in"}</td>
                  <td className="px-4 py-3 text-ink-muted">{o._count.items}</td>
                  <td className="px-4 py-3 text-ink-muted">{formatDate(o.orderDate)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/artisan-appreciation/new?orderId=${o.id}`}
                      className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-sunken"
                    >
                      Select
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-ink-faint">Tip: you can also generate QR codes straight from any order&apos;s page.</p>
    </div>
  );
}
