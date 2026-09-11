import Link from "next/link";
import { Plus, Hammer, Pencil, Archive, RotateCcw, Package, IndianRupee, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";
import { ARTISAN_TYPE_LABEL } from "@/lib/artisan-type";
import { archiveArtisan, restoreArtisan } from "@/lib/actions/artisans";

export default async function ArtisansPage() {
  const [artisans, productsAssigned, salesAgg] = await Promise.all([
    prisma.artisan.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
    prisma.product.count({ where: { artisanId: { not: null } } }),
    prisma.orderItem.aggregate({
      _sum: { total: true },
      where: {
        product: { artisanId: { not: null } },
        order: { status: "COMPLETED" },
      },
    }),
  ]);

  const netSales = salesAgg._sum.total?.toString() ?? "0";

  return (
    <div>
      <PageHeader
        title="Artisans"
        description="Profiles for every creator making your products, with what's assigned to them."
        actions={
          <Link
            href="/artisans/new"
            className="flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus size={16} /> Add Artisan
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Artisans" value={String(artisans.length)} icon={Users} />
        <StatCard label="Products Assigned" value={String(productsAssigned)} icon={Package} />
        <StatCard label="Net Sales" value={formatCurrency(netSales)} icon={IndianRupee} />
      </div>

      {artisans.length === 0 ? (
        <EmptyState
          icon={Hammer}
          title="No artisans yet"
          description="Add your first artisan profile to start assigning products."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-sunken text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Products</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {artisans.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-mono text-xs text-ink-muted">{a.code}</td>
                  <td className="px-4 py-3">
                    <Link href={`/artisans/${a.id}`} className="font-medium text-ink hover:text-brand">
                      {a.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{ARTISAN_TYPE_LABEL[a.type] ?? a.type}</td>
                  <td className="px-4 py-3 text-ink-muted">{a.phone || "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{a._count.products}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={a.status === "ACTIVE" ? "Active" : "Archived"}
                      tone={a.status === "ACTIVE" ? "good" : "neutral"}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/artisans/${a.id}/edit`}
                        className="rounded-md p-2 text-ink-muted hover:bg-surface-sunken hover:text-ink"
                        aria-label={`Edit ${a.name}`}
                      >
                        <Pencil size={16} />
                      </Link>
                      {a.status === "ACTIVE" ? (
                        <form action={archiveArtisan.bind(null, a.id)}>
                          <button
                            type="submit"
                            className="rounded-md p-2 text-ink-muted hover:bg-surface-sunken hover:text-bad"
                            aria-label={`Archive ${a.name}`}
                          >
                            <Archive size={16} />
                          </button>
                        </form>
                      ) : (
                        <form action={restoreArtisan.bind(null, a.id)}>
                          <button
                            type="submit"
                            className="rounded-md p-2 text-ink-muted hover:bg-surface-sunken hover:text-good"
                            aria-label={`Restore ${a.name}`}
                          >
                            <RotateCcw size={16} />
                          </button>
                        </form>
                      )}
                    </div>
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