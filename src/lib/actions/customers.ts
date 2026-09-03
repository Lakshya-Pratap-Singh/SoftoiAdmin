"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ActionState } from "@/lib/actions/categories";

export async function createCustomer(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) return { error: "Customer name is required." };

  await prisma.customer.create({
    data: { name, phone: phone || null, email: email || null, notes: notes || null },
  });

  revalidatePath("/customers");
  redirect("/customers");
}
