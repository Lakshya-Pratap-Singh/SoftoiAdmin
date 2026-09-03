"use client";

import { useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PickableProduct = {
  id: string;
  name: string;
  sku: string | null;
  productCode: string;
  currentStock: number;
  sellingPrice: string | null;
};

export function ProductCombobox({
  products,
  hiddenFieldName,
  onSelect,
  placeholder = "Search by name, SKU, or product code…",
}: {
  products: PickableProduct[];
  hiddenFieldName: string;
  onSelect?: (product: PickableProduct | null) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PickableProduct | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 20);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.productCode.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [products, query]);

  function pick(p: PickableProduct) {
    setSelected(p);
    setQuery(p.name);
    setOpen(false);
    onSelect?.(p);
  }

  return (
    <div className="relative">
      <input type="hidden" name={hiddenFieldName} value={selected?.id ?? ""} />
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (selected) {
              setSelected(null);
              onSelect?.(null);
            }
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-md border border-border bg-surface py-2.5 pl-9 pr-3.5 text-[15px] text-ink outline-none transition-colors focus:border-brand"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-surface shadow-md">
          {filtered.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => pick(p)}
              className={cn(
                "flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm hover:bg-surface-sunken",
                selected?.id === p.id && "bg-brand-tint"
              )}
            >
              <span>
                <span className="font-medium text-ink">{p.name}</span>
                <span className="ml-2 text-xs text-ink-faint">
                  {p.productCode}
                  {p.sku ? ` · ${p.sku}` : ""}
                </span>
              </span>
              <span className="flex items-center gap-2 text-xs text-ink-muted">
                {p.currentStock} in stock
                {selected?.id === p.id && <Check size={14} className="text-brand" />}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
