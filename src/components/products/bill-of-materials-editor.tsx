"use client";

import { useMemo, useState } from "react";
import { Plus, X, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type ComponentOption = { id: string; name: string; productType: string };
type BomRow = { key: string; componentProductId: string; quantity: string };

const TYPE_LABEL: Record<string, string> = {
  RAW_MATERIAL: "Raw Material",
  COMPONENT: "Component",
};

let rowCounter = 0;
function newRow(componentProductId = "", quantity = ""): BomRow {
  rowCounter += 1;
  return { key: `row-${rowCounter}`, componentProductId, quantity };
}

// A per-row searchable picker for one component — type to filter by name,
// click a result to select it. Mirrors the search+dropdown pattern used
// for picking products in the Stock In/Out/Adjustment forms.
function ComponentPicker({
  options,
  value,
  onSelect,
}: {
  options: ComponentOption[];
  value: string;
  onSelect: (id: string) => void;
}) {
  const selected = options.find((o) => o.id === value) ?? null;
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 20);
    return options.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 20);
  }, [options, query]);

  function pick(o: ComponentOption) {
    onSelect(o.id);
    setQuery(o.name);
    setOpen(false);
  }

  return (
    <div className="relative flex-1">
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value) onSelect("");
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search a component…"
          className="w-full rounded-md border border-border bg-surface py-2 pl-8 pr-3 text-sm text-ink outline-none focus:border-brand"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-surface shadow-md">
          {filtered.map((o) => (
            <button
              type="button"
              key={o.id}
              onClick={() => pick(o)}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-sunken",
                value === o.id && "bg-brand-tint"
              )}
            >
              <span className="text-ink">{o.name}</span>
              <span className="flex items-center gap-2 text-xs text-ink-faint">
                {TYPE_LABEL[o.productType] ?? o.productType}
                {value === o.id && <Check size={14} className="text-brand" />}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BillOfMaterialsEditor({
  componentOptions,
  defaultRows,
}: {
  componentOptions: ComponentOption[];
  defaultRows?: { componentProductId: string; quantity: string }[];
}) {
  const [rows, setRows] = useState<BomRow[]>(() =>
    defaultRows && defaultRows.length > 0
      ? defaultRows.map((r) => newRow(r.componentProductId, r.quantity))
      : [newRow()]
  );

  function updateRow(key: string, patch: Partial<BomRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.key !== key)));
  }

  if (componentOptions.length === 0) {
    return (
      <p className="text-sm text-ink-faint">
        No raw material or component products exist yet — add some (set their Product Type to
        Raw Material or Component) before you can build a recipe here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-2">
          <input type="hidden" name="componentId" value={row.componentProductId} />
          <ComponentPicker
            options={componentOptions}
            value={row.componentProductId}
            onSelect={(id) => updateRow(row.key, { componentProductId: id })}
          />
          <input
            name="componentQty"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Qty"
            value={row.quantity}
            onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
            className="w-24 shrink-0 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={() => removeRow(row.key)}
            disabled={rows.length === 1}
            className="shrink-0 rounded-md p-2 text-ink-faint hover:bg-surface-sunken hover:text-bad disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Remove component"
          >
            <X size={16} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, newRow()])}
        className="mt-1 flex w-fit items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:border-brand hover:text-brand"
      >
        <Plus size={14} /> Add Component
      </button>

      <p className="mt-1 text-xs text-ink-faint">
        Quantity used per 1 unit of this finished product — decimals are fine (e.g. 0.5 of a wrap sheet).
      </p>
    </div>
  );
}