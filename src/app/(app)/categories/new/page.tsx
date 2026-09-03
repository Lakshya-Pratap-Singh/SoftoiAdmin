import Link from "next/link";
import { PageHeader } from "@/components/ui/card";
import { Field, TextInput, Textarea, SubmitButton, SecondaryButton } from "@/components/ui/form";
import { ActionForm } from "@/components/ui/action-form";
import { createCategory } from "@/lib/actions/categories";

export default function NewCategoryPage() {
  return (
    <div>
      <PageHeader title="Add Category" description="Create a new product category." />
      <div className="max-w-lg rounded-lg border border-border bg-surface p-6">
        <ActionForm action={createCategory} className="flex flex-col gap-4">
          <Field label="Category name" htmlFor="name" required>
            <TextInput id="name" name="name" required placeholder="e.g. Keychains" />
          </Field>
          <Field label="Description" htmlFor="description">
            <Textarea id="description" name="description" rows={3} placeholder="Optional" />
          </Field>
          <div className="mt-2 flex gap-2">
            <SubmitButton>Add Category</SubmitButton>
            <Link href="/categories">
              <SecondaryButton type="button">Cancel</SecondaryButton>
            </Link>
          </div>
        </ActionForm>
      </div>
    </div>
  );
}
