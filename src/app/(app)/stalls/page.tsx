import Link from "next/link";
import { Plus, Store, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";

const STATUS_TONE = {
  UPCOMING: "neutral",
  ACTIVE: "good",
  COMPLETED: "neutral",
  CANCELLED: "bad",
} as const;

export default async function StallsPage() {
  const stalls = await prisma.stall.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Stalls & Events"
        description="Track physical selling locations — malls, exhibitions, and pop-ups."
        actions={
          <Link
            href="/stalls/new"
            className="flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus size={16} /> Add Stall
          </Link>
        }
      />

      {stalls.length === 0 ? (
        <EmptyState icon={Store} title="No stalls yet" description="Add a stall or event to start tracking offline sales locations." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-sunken text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Stall</th>
                <th className="px-4 py-3 font-medium">Mall / Event</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stalls.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{s.name}</p>
                    <p className="text-xs text-ink-faint">{s.stallCode}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {[s.mallName, s.eventName].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">
                    {s.startDate ? s.startDate.toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}
                    {s.endDate ? ` – ${s.endDate.toLocaleDateString("en-IN", { dateStyle: "medium" })}` : ""}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{s._count.orders}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={s.status} tone={STATUS_TONE[s.status]} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/stalls/${s.id}/edit`}
                      className="rounded-md p-2 text-ink-muted hover:bg-surface-sunken hover:text-ink"
                      aria-label={`Edit ${s.name}`}
                    >
                      <Pencil size={16} />
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
