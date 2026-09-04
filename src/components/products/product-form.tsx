"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Field, TextInput, Select, Textarea, SubmitButton, SecondaryButton } from "@/components/ui/form";
import { ImageUpload } from "@/components/products/image-upload";
import type { ActionState } from "@/lib/actions/categories";

type Category = { id: string; name: string };

export function ProductForm({
  action,
  categories,
  mode,
  defaults,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  categories: Category[];
  mode: "create" | "edit";
  defaults?: {
    name?: string;
    sku?: string;
    categoryId?: string;
    productType?: string;
    description?: string;
    imageUrl?: string;
    minimumStock?: number;
    costPrice?: string;
    sellingPrice?: string;
    notes?: string;
  };
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [imageUrl, setImageUrl] = useState(defaults?.imageUrl ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-[15px] font-medium text-ink">Basic</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Product name" htmlFor="name" required>
            <TextInput id="name" name="name" required defaultValue={defaults?.name} placeholder="e.g. Sunflower Keychain" />
          </Field>
          {mode === "create" && (
            <Field label="Initial quantity" htmlFor="initialQuantity" required>
              <TextInput id="initialQuantity" name="initialQuantity" type="number" min={0} required placeholder="0" />
            </Field>
          )}
          <Field label="SKU" htmlFor="sku">
            <TextInput id="sku" name="sku" defaultValue={defaults?.sku} placeholder="Optional" />
          </Field>
          <Field label="Category" htmlFor="categoryId">
            <Select id="categoryId" name="categoryId" defaultValue={defaults?.categoryId ?? ""}>
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Product type" htmlFor="productType">
            <Select id="productType" name="productType" defaultValue={defaults?.productType ?? "FINISHED_PRODUCT"}>
              <option value="FINISHED_PRODUCT">Finished Product</option>
              <option value="RAW_MATERIAL">Raw Material</option>
              <option value="COMPONENT">Component</option>
            </Select>
          </Field>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Product image" htmlFor="imageUrl" hint="Upload a photo, or paste a hosted image link below">
            <ImageUpload value={imageUrl} onChange={setImageUrl} />
            <TextInput
              id="imageUrl"
              name="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              className="mt-2"
            />
          </Field>
          <Field label="Description" htmlFor="description">
            <Textarea id="description" name="description" rows={3} defaultValue={defaults?.description} />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-[15px] font-medium text-ink">Inventory</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Minimum stock level" htmlFor="minimumStock" hint="Used to trigger low stock alerts">
            <TextInput
              id="minimumStock"
              name="minimumStock"
              type="number"
              min={0}
              defaultValue={defaults?.minimumStock}
              placeholder="0"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-[15px] font-medium text-ink">Pricing</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Cost price (₹)" htmlFor="costPrice">
            <TextInput id="costPrice" name="costPrice" type="number" step="0.01" min={0} defaultValue={defaults?.costPrice} />
          </Field>
          <Field label="Selling price (₹)" htmlFor="sellingPrice">
            <TextInput id="sellingPrice" name="sellingPrice" type="number" step="0.01" min={0} defaultValue={defaults?.sellingPrice} />
          </Field>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-[15px] font-medium text-ink">Other</h2>
        <Field label="Notes" htmlFor="notes">
          <Textarea id="notes" name="notes" rows={2} defaultValue={defaults?.notes} />
        </Field>
      </section>

      {state?.error && (
        <p role="alert" className="rounded-md bg-bad-tint px-3.5 py-2.5 text-sm text-bad">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <SubmitButton>{mode === "create" ? "Add Product" : "Save Changes"}</SubmitButton>
        <Link href="/products">
          <SecondaryButton type="button">Cancel</SecondaryButton>
        </Link>
      </div>
    </form>
  );
}
