import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Basic customer records linked to orders."
        actions={
          <Link
            href="/customers/new"
            className="flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus size={16} /> Add Customer
          </Link>
        }
      />

      {customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers yet" description="Customers are optional for POS sales, but you can add them here too." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-sunken text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{c._count.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
