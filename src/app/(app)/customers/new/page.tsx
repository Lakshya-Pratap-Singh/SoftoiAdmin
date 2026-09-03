import Link from "next/link";
import { PageHeader } from "@/components/ui/card";
import { Field, TextInput, Textarea, SubmitButton, SecondaryButton } from "@/components/ui/form";
import { ActionForm } from "@/components/ui/action-form";
import { createCustomer } from "@/lib/actions/customers";

export default function NewCustomerPage() {
  return (
    <div>
      <PageHeader title="Add Customer" description="Create a customer record." />
      <div className="max-w-lg rounded-lg border border-border bg-surface p-6">
        <ActionForm action={createCustomer} className="flex flex-col gap-4">
          <Field label="Name" htmlFor="name" required>
            <TextInput id="name" name="name" required />
          </Field>
          <Field label="Phone" htmlFor="phone">
            <TextInput id="phone" name="phone" />
          </Field>
          <Field label="Email" htmlFor="email">
            <TextInput id="email" name="email" type="email" />
          </Field>
          <Field label="Notes" htmlFor="notes">
            <Textarea id="notes" name="notes" rows={3} />
          </Field>
          <div className="mt-2 flex gap-2">
            <SubmitButton>Add Customer</SubmitButton>
            <Link href="/customers">
              <SecondaryButton type="button">Cancel</SecondaryButton>
            </Link>
          </div>
        </ActionForm>
      </div>
    </div>
  );
}
