"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateArtisanCode } from "@/lib/id-generators";
import type { ActionState } from "@/lib/actions/categories";

const VALID_TYPES = new Set(["FAMILY", "RAW_MATERIAL_SUPPLIED", "INDEPENDENT"]);

export async function createArtisan(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) return { error: "Artisan name is required." };
  if (!VALID_TYPES.has(type)) return { error: "Please select a valid artisan type." };

  const code = await generateArtisanCode(name);

  await prisma.artisan.create({
    data: {
      code,
      name,
      type: type as never,
      phone: phone || null,
      notes: notes || null,
    },
  });

  revalidatePath("/artisans");
  redirect("/artisans");
}

export async function updateArtisan(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) return { error: "Artisan name is required." };
  if (!VALID_TYPES.has(type)) return { error: "Please select a valid artisan type." };

  // The code is generated once at creation and left alone afterwards —
  // same convention as product codes and order numbers elsewhere in the
  // app. Renaming an artisan doesn't change their initials-based code.
  await prisma.artisan.update({
    where: { id },
    data: {
      name,
      type: type as never,
      phone: phone || null,
      notes: notes || null,
    },
  });

  revalidatePath("/artisans");
  revalidatePath(`/artisans/${id}`);
  redirect(`/artisans/${id}`);
}

export async function archiveArtisan(id: string) {
  "use server";
  await prisma.artisan.update({ where: { id }, data: { status: "ARCHIVED" } });
  revalidatePath("/artisans");
  revalidatePath(`/artisans/${id}`);
}

export async function restoreArtisan(id: string) {
  "use server";
  await prisma.artisan.update({ where: { id }, data: { status: "ACTIVE" } });
  revalidatePath("/artisans");
  revalidatePath(`/artisans/${id}`);
}

/**
 * Syncs which products belong to this artisan from a checkbox selection.
 * Checked products get artisanId set to this artisan (taking over from
 * whichever artisan they were linked to before, if any — a product has
 * only one maker at a time). Products that were assigned to this artisan
 * but got unchecked are unassigned (artisanId set back to null).
 */
export async function assignProductsToArtisan(artisanId: string, formData: FormData) {
  "use server";
  const selectedIds = formData.getAll("productIds").map(String).filter(Boolean);

  await prisma.$transaction([
    prisma.product.updateMany({
      where: { artisanId, id: { notIn: selectedIds } },
      data: { artisanId: null },
    }),
    ...(selectedIds.length > 0
      ? [
          prisma.product.updateMany({
            where: { id: { in: selectedIds } },
            data: { artisanId },
          }),
        ]
      : []),
  ]);

  revalidatePath(`/artisans/${artisanId}`);
  revalidatePath("/artisans");
  revalidatePath("/products");
}