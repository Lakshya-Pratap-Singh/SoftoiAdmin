"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ActionState } from "@/lib/actions/categories";

export async function updateSettings(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const businessName = String(formData.get("businessName") ?? "").trim();
  const businessLogoUrl = String(formData.get("businessLogoUrl") ?? "").trim();
  const currency = String(formData.get("currency") ?? "INR").trim();
  const defaultMinimumStock = Number(formData.get("defaultMinimumStock") ?? 0) || 0;
  const allowNegativeStock = formData.get("allowNegativeStock") === "on";

  if (!businessName) return { error: "Business name is required." };

  const existing = await prisma.settings.findFirst();

  if (existing) {
    await prisma.settings.update({
      where: { id: existing.id },
      data: { businessName, businessLogoUrl: businessLogoUrl || null, currency, defaultMinimumStock, allowNegativeStock },
    });
  } else {
    await prisma.settings.create({
      data: { businessName, businessLogoUrl: businessLogoUrl || null, currency, defaultMinimumStock, allowNegativeStock },
    });
  }

  revalidatePath("/settings");
  return { error: undefined };
}
