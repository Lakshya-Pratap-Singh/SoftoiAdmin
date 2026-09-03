"use client";

import { useActionState, useState } from "react";
import { ProductCombobox, type PickableProduct } from "./product-combobox";
import { Field, TextInput, Select, Textarea, SubmitButton } from "@/components/ui/form";
import { stockAdjustment } from "@/lib/actions/inventory";

const REASONS = ["Physical Count Correction", "Damage", "Lost", "Counting Error", "Other"];

export function StockAdjustmentForm({ products }: { products: PickableProduct[] }) {
  const [state, formAction] = useActionState(stockAdjustment, undefined);
  const [selected, setSelected] = useState<PickableProduct | null>(null);
  const [actual, setActual] = useState<string>("");

  const system = selected?.currentStock ?? 0;
  const actualNum = actual === "" ? null : Number(actual);
  const difference = actualNum === null ? null : actualNum - system;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Product" htmlFor="product-search" required>
        <ProductCombobox products={products} hiddenFieldName="productId" onSelect={setSelected} />
      </Field>

      <Field label="Actual physical quantity" htmlFor="actualQuantity" required>
        <TextInput
          id="actualQuantity"
          name="actualQuantity"
          type="number"
          min={0}
          required
          value={actual}
          onChange={(e) => setActual(e.target.value)}
        />
      </Field>

      {selected && actualNum !== null && (
        <div className="grid grid-cols-3 gap-3 rounded-md bg-surface-sunken p-4 text-center">
          <div>
            <p className="text-xs text-ink-muted">System stock</p>
            <p className="mt-1 text-lg font-semibold text-ink">{system}</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Physical stock</p>
            <p className="mt-1 text-lg font-semibold text-ink">{actualNum}</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Difference</p>
            <p
              className={`mt-1 text-lg font-semibold ${
                (difference ?? 0) < 0 ? "text-bad" : (difference ?? 0) > 0 ? "text-good" : "text-ink"
              }`}
            >
              {(difference ?? 0) > 0 ? "+" : ""}
              {difference}
            </p>
          </div>
        </div>
      )}

      <Field label="Reason" htmlFor="reason" required>
        <Select id="reason" name="reason" required defaultValue="">
          <option value="" disabled>
            Select a reason
          </option>
          {REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Notes" htmlFor="notes">
        <Textarea id="notes" name="notes" rows={2} placeholder="Optional" />
      </Field>

      {state?.error && (
        <p role="alert" className="rounded-md bg-bad-tint px-3.5 py-2.5 text-sm text-bad">
          {state.error}
        </p>
      )}

      <SubmitButton className="self-start">Confirm Adjustment</SubmitButton>
    </form>
  );
}
