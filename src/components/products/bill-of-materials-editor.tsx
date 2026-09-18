"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

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
          <select
            name="componentId"
            value={row.componentProductId}
            onChange={(e) => updateRow(row.key, { componentProductId: e.target.value })}
            className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          >
            <option value="">Select a component…</option>
            {componentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({TYPE_LABEL[c.productType] ?? c.productType})
              </option>
            ))}
          </select>
          <input
            name="componentQty"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Qty"
            value={row.quantity}
            onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
            className="w-24 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={() => removeRow(row.key)}
            disabled={rows.length === 1}
            className="rounded-md p-2 text-ink-faint hover:bg-surface-sunken hover:text-bad disabled:cursor-not-allowed disabled:opacity-40"
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