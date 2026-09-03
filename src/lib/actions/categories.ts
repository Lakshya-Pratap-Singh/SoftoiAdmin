"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export type ActionState = { error?: string } | undefined;

export async function createCategory(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) return { error: "Category name is required." };

  await prisma.category.create({
    data: { name, description: description || null },
  });

  revalidatePath("/categories");
  redirect("/categories");
}

export async function updateCategory(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) return { error: "Category name is required." };

  await prisma.category.update({
    where: { id },
    data: { name, description: description || null },
  });

  revalidatePath("/categories");
  redirect("/categories");
}

export async function archiveCategory(id: string) {
  "use server";
  await prisma.category.update({ where: { id }, data: { status: "ARCHIVED" } });
  revalidatePath("/categories");
}

export async function restoreCategory(id: string) {
  "use server";
  await prisma.category.update({ where: { id }, data: { status: "ACTIVE" } });
  revalidatePath("/categories");
}
