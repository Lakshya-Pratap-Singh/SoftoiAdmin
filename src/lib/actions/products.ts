"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateProductCode } from "@/lib/id-generators";
import type { ActionState } from "@/lib/actions/categories";

function parseDecimal(value: FormDataEntryValue | null): number | null {
  if (value === null) return null;
  const str = String(value).trim();
  if (!str) return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

export async function createProduct(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const initialQuantityRaw = String(formData.get("initialQuantity") ?? "").trim();
  const initialQuantity = Number(initialQuantityRaw);

  if (!name) return { error: "Product name is required." };
  if (!initialQuantityRaw || !Number.isFinite(initialQuantity) || initialQuantity < 0) {
    return { error: "Initial quantity must be a number of 0 or more." };
  }

  const sku = String(formData.get("sku") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const productType = String(formData.get("productType") ?? "FINISHED_PRODUCT");
  const description = String(formData.get("description") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const minimumStockRaw = String(formData.get("minimumStock") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const costPrice = parseDecimal(formData.get("costPrice"));
  const sellingPrice = parseDecimal(formData.get("sellingPrice"));

  if (sku) {
    const existingSku = await prisma.product.findUnique({ where: { sku } });
    if (existingSku) return { error: `SKU "${sku}" is already in use.` };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const productCode = await generateProductCode();
      const product = await tx.product.create({
        data: {
          productCode,
          name,
          sku: sku || null,
          categoryId: categoryId || null,
          productType: productType as never,
          description: description || null,
          imageUrl: imageUrl || null,
          currentStock: initialQuantity,
          minimumStock: minimumStockRaw ? Number(minimumStockRaw) : 0,
          costPrice,
          sellingPrice,
          notes: notes || null,
        },
      });

      if (initialQuantity > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            movementType: "INITIAL_STOCK",
            quantity: initialQuantity,
            previousQuantity: 0,
            newQuantity: initialQuantity,
            reason: "Initial stock on product creation",
            referenceType: "PRODUCT_CREATION",
            referenceId: product.id,
          },
        });
      }
    });
  } catch {
    return { error: "Something went wrong creating the product. Please try again." };
  }

  revalidatePath("/products");
  revalidatePath("/");
  redirect("/products");
}

export async function updateProduct(
  id: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Product name is required." };

  const sku = String(formData.get("sku") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const productType = String(formData.get("productType") ?? "FINISHED_PRODUCT");
  const description = String(formData.get("description") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const minimumStockRaw = String(formData.get("minimumStock") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const costPrice = parseDecimal(formData.get("costPrice"));
  const sellingPrice = parseDecimal(formData.get("sellingPrice"));

  if (sku) {
    const existingSku = await prisma.product.findFirst({ where: { sku, NOT: { id } } });
    if (existingSku) return { error: `SKU "${sku}" is already in use.` };
  }

  await prisma.product.update({
    where: { id },
    data: {
      name,
      sku: sku || null,
      categoryId: categoryId || null,
      productType: productType as never,
      description: description || null,
      imageUrl: imageUrl || null,
      minimumStock: minimumStockRaw ? Number(minimumStockRaw) : 0,
      costPrice,
      sellingPrice,
      notes: notes || null,
    },
  });

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  revalidatePath("/");
  redirect(`/products/${id}`);
}

export async function archiveProduct(id: string) {
  "use server";
  await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
}

export async function restoreProduct(id: string) {
  "use server";
  await prisma.product.update({ where: { id }, data: { status: "ACTIVE" } });
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
}
