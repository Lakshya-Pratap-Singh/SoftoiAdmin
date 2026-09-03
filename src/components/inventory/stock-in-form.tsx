"use client";

import { useActionState, useState } from "react";
import { ProductCombobox, type PickableProduct } from "./product-combobox";
import { Field, TextInput, Select, Textarea, SubmitButton } from "@/components/ui/form";
import { stockIn } from "@/lib/actions/inventory";

const REASONS = ["New Production", "Purchase", "Return", "Manual Addition", "Other"];

export function StockInForm({ products }: { products: PickableProduct[] }) {
  const [state, formAction] = useActionState(stockIn, undefined);
  const [selected, setSelected] = useState<PickableProduct | null>(null);
  const [quantity, setQuantity] = useState<number>(0);

  const current = selected?.currentStock ?? 0;
  const next = current + (Number.isFinite(quantity) ? quantity : 0);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Product" htmlFor="product-search" required>
        <ProductCombobox products={products} hiddenFieldName="productId" onSelect={setSelected} />
      </Field>

      <Field label="Quantity to add" htmlFor="quantity" required>
        <TextInput
          id="quantity"
          name="quantity"
          type="number"
          min={1}
          required
          value={quantity || ""}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
      </Field>

      {selected && (
        <div className="grid grid-cols-3 gap-3 rounded-md bg-surface-sunken p-4 text-center">
          <div>
            <p className="text-xs text-ink-muted">Current stock</p>
            <p className="mt-1 text-lg font-semibold text-ink">{current}</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">Quantity added</p>
            <p className="mt-1 text-lg font-semibold text-good">+{quantity || 0}</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">New stock</p>
            <p className="mt-1 text-lg font-semibold text-ink">{next}</p>
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

      <SubmitButton className="self-start">Confirm Stock In</SubmitButton>
    </form>
  );
}
