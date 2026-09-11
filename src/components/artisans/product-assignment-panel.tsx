"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { ProductAvatar } from "@/components/ui/product-avatar";
import { assignProductsToArtisan } from "@/lib/actions/artisans";

type AssignableProduct = {
  id: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  artisanId: string | null;
  artisanName: string | null;
};

export function ProductAssignmentPanel({
  artisanId,
  artisanName,
  products,
}: {
  artisanId: string;
  artisanName: string;
  products: AssignableProduct[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boundAction = assignProductsToArtisan.bind(null, artisanId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q)
    );
  }, [products, query]);

  return (
    <div className="mt-6 rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left"
      >
        <span className="text-[15px] font-medium text-ink">Manage Assigned Products</span>
        {open ? <ChevronUp size={18} className="text-ink-muted" /> : <ChevronDown size={18} className="text-ink-muted" />}
      </button>

      {open && (
        <form action={boundAction} className="border-t border-border">
          <div className="relative p-4 pb-2">
            <Search size={16} className="pointer-events-none absolute left-7 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              className="w-full rounded-md border border-border bg-background py-2.5 pl-9 pr-3.5 text-sm text-ink outline-none focus:border-brand"
            />
          </div>

          <div className="max-h-96 overflow-y-auto px-4 pb-2">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-faint">No products match.</p>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((p) => {
                  const belongsToOther = p.artisanId && p.artisanId !== artisanId;
                  return (
                    <li key={p.id} className="flex items-center gap-3 py-2.5">
                      <input
                        type="checkbox"
                        id={`product-${p.id}`}
                        name="productIds"
                        value={p.id}
                        defaultChecked={p.artisanId === artisanId}
                        className="h-4 w-4 shrink-0 rounded border-border accent-brand"
                      />
                      <label htmlFor={`product-${p.id}`} className="flex flex-1 cursor-pointer items-center gap-3">
                        <ProductAvatar src={p.imageUrl} alt={p.name} size={28} rounded="md" />
                        <span className="flex-1">
                          <span className="text-sm font-medium text-ink">{p.name}</span>
                          {p.sku && <span className="ml-2 text-xs text-ink-faint">{p.sku}</span>}
                        </span>
                        {belongsToOther && (
                          <span className="shrink-0 text-xs text-ink-faint">
                            Currently: {p.artisanName}
                          </span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-xs text-ink-faint">
              Checking a product already assigned elsewhere reassigns it to {artisanName}.
            </p>
            <button
              type="submit"
              className="shrink-0 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Save Assignments
            </button>
          </div>
        </form>
      )}
    </div>
  );
}