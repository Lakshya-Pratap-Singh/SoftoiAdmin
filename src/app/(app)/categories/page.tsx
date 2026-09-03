import Link from "next/link";
import { Plus, Tags, Pencil, Archive, RotateCcw } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { archiveCategory, restoreCategory } from "@/lib/actions/categories";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organize products into groups like Keychains or Hair Accessories."
        actions={
          <Link
            href="/categories/new"
            className="flex items-center gap-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus size={16} /> Add Category
          </Link>
        }
      />

      {categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories yet"
          description="Add your first category to start organizing products."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-sunken text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Products</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{c.description || "—"}</td>
                  <td className="px-4 py-3 text-ink-muted">{c._count.products}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={c.status === "ACTIVE" ? "Active" : "Archived"}
                      tone={c.status === "ACTIVE" ? "good" : "neutral"}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/categories/${c.id}/edit`}
                        className="rounded-md p-2 text-ink-muted hover:bg-surface-sunken hover:text-ink"
                        aria-label={`Edit ${c.name}`}
                      >
                        <Pencil size={16} />
                      </Link>
                      {c.status === "ACTIVE" ? (
                        <form action={archiveCategory.bind(null, c.id)}>
                          <button
                            type="submit"
                            className="rounded-md p-2 text-ink-muted hover:bg-surface-sunken hover:text-bad"
                            aria-label={`Archive ${c.name}`}
                          >
                            <Archive size={16} />
                          </button>
                        </form>
                      ) : (
                        <form action={restoreCategory.bind(null, c.id)}>
                          <button
                            type="submit"
                            className="rounded-md p-2 text-ink-muted hover:bg-surface-sunken hover:text-good"
                            aria-label={`Restore ${c.name}`}
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
