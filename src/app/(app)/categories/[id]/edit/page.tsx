import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/card";
import { Field, TextInput, Textarea, SubmitButton, SecondaryButton } from "@/components/ui/form";
import { ActionForm } from "@/components/ui/action-form";
import { updateCategory } from "@/lib/actions/categories";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) notFound();

  const boundAction = updateCategory.bind(null, id);

  return (
    <div>
      <PageHeader title="Edit Category" description={category.name} />
      <div className="max-w-lg rounded-lg border border-border bg-surface p-6">
        <ActionForm action={boundAction} className="flex flex-col gap-4">
          <Field label="Category name" htmlFor="name" required>
            <TextInput id="name" name="name" required defaultValue={category.name} />
          </Field>
          <Field label="Description" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={category.description ?? ""}
            />
          </Field>
          <div className="mt-2 flex gap-2">
            <SubmitButton>Save Changes</SubmitButton>
            <Link href="/categories">
              <SecondaryButton type="button">Cancel</SecondaryButton>
            </Link>
          </div>
        </ActionForm>
      </div>
    </div>
  );
}
