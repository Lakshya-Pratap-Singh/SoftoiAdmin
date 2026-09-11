"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, Select, Textarea, TextInput, SubmitButton, SecondaryButton } from "@/components/ui/form";
import type { ActionState } from "@/lib/actions/categories";
import { ARTISAN_TYPE_OPTIONS } from "@/lib/artisan-type";

type ArtisanFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  mode: "create" | "edit";
  defaults?: {
    name?: string;
    type?: string;
    phone?: string;
    notes?: string;
  };
};

export function ArtisanForm({ action, mode, defaults }: ArtisanFormProps) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Artisan name" htmlFor="name" required>
        <TextInput id="name" name="name" required defaultValue={defaults?.name} placeholder="e.g. Asha Sharma" />
      </Field>
      <Field label="Artisan type" htmlFor="type" required>
        <Select id="type" name="type" required defaultValue={defaults?.type ?? ""}>
          <option value="" disabled>
            Select a type
          </option>
          {ARTISAN_TYPE_OPTIONS.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Phone" htmlFor="phone">
        <TextInput id="phone" name="phone" type="tel" defaultValue={defaults?.phone} placeholder="Optional" />
      </Field>
      <Field label="Notes" htmlFor="notes">
        <Textarea id="notes" name="notes" rows={3} defaultValue={defaults?.notes} />
      </Field>
      {state?.error && (
        <p role="alert" className="rounded-md bg-bad-tint px-3.5 py-2.5 text-sm text-bad">
          {state.error}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <SubmitButton>{mode === "create" ? "Add Artisan" : "Save Changes"}</SubmitButton>
        <Link href="/artisans">
          <SecondaryButton type="button">Cancel</SecondaryButton>
        </Link>
      </div>
    </form>
  );
}