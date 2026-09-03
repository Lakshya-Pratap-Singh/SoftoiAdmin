"use client";

import { useActionState } from "react";
import { Field, TextInput, SubmitButton } from "@/components/ui/form";
import { updateSettings } from "@/lib/actions/settings";

type Defaults = {
  businessName: string;
  businessLogoUrl: string;
  currency: string;
  defaultMinimumStock: number;
  allowNegativeStock: boolean;
};

export function SettingsForm({ defaults }: { defaults: Defaults }) {
  const [state, formAction, pending] = useActionState(updateSettings, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className="max-w-lg rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-[15px] font-medium text-ink">Business Settings</h2>
        <div className="flex flex-col gap-4">
          <Field label="Business name" htmlFor="businessName" required>
            <TextInput id="businessName" name="businessName" required defaultValue={defaults.businessName} />
          </Field>
          <Field label="Business logo URL" htmlFor="businessLogoUrl" hint="Optional">
            <TextInput id="businessLogoUrl" name="businessLogoUrl" defaultValue={defaults.businessLogoUrl} />
          </Field>
          <Field label="Currency" htmlFor="currency">
            <TextInput id="currency" name="currency" defaultValue={defaults.currency} />
          </Field>
        </div>
      </section>

      <section className="max-w-lg rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-[15px] font-medium text-ink">Inventory Settings</h2>
        <div className="flex flex-col gap-4">
          <Field label="Default minimum stock level" htmlFor="defaultMinimumStock">
            <TextInput
              id="defaultMinimumStock"
              name="defaultMinimumStock"
              type="number"
              min={0}
              defaultValue={defaults.defaultMinimumStock}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="allowNegativeStock"
              defaultChecked={defaults.allowNegativeStock}
              className="h-4 w-4 rounded border-border accent-[var(--color-brand)]"
            />
            Allow negative stock
          </label>
        </div>
      </section>

      {state?.error && (
        <p role="alert" className="max-w-lg rounded-md bg-bad-tint px-3.5 py-2.5 text-sm text-bad">
          {state.error}
        </p>
      )}
      {state && !state.error && !pending && (
        <p className="max-w-lg rounded-md bg-good-tint px-3.5 py-2.5 text-sm text-good">Settings saved.</p>
      )}

      <SubmitButton className="self-start">Save Settings</SubmitButton>
    </form>
  );
}
