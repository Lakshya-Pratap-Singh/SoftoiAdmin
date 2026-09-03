"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ActionState } from "@/lib/actions/categories";

function revalidateStockPaths(productId: string) {
  revalidatePath("/inventory");
  revalidatePath("/inventory/stock-history");
  revalidatePath("/inventory/low-stock");
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/");
}

export async function stockIn(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const productId = String(formData.get("productId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!productId) return { error: "Select a product." };
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Quantity must be a positive number." };
  }
  if (!reason) return { error: "Select a reason." };

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { error: "Product not found." };

  const previousQuantity = product.currentStock;
  const newQuantity = previousQuantity + quantity;

  await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: { currentStock: newQuantity },
    }),
    prisma.stockMovement.create({
      data: {
        productId,
        movementType: "STOCK_IN",
        quantity,
        previousQuantity,
        newQuantity,
        reason,
        notes: notes || null,
      },
    }),
  ]);

  revalidateStockPaths(productId);
  redirect("/inventory/stock-history");
}

export async function stockOut(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const productId = String(formData.get("productId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);
  const reason = String(formData.get("reason") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!productId) return { error: "Select a product." };
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: "Quantity must be a positive number." };
  }
  if (!reason) return { error: "Select a reason." };

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { error: "Product not found." };

  const previousQuantity = product.currentStock;

  const settings = await prisma.settings.findFirst();
  const allowNegative = settings?.allowNegativeStock ?? false;

  if (!allowNegative && quantity > previousQuantity) {
    return { error: "Insufficient stock available." };
  }

  const newQuantity = previousQuantity - quantity;

  await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: { currentStock: newQuantity },
    }),
    prisma.stockMovement.create({
      data: {
        productId,
        movementType: "STOCK_OUT",
        quantity: -quantity,
        previousQuantity,
        newQuantity,
        reason,
        notes: notes || null,
      },
    }),
  ]);

  revalidateStockPaths(productId);
  redirect("/inventory/stock-history");
}

export async function stockAdjustment(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const productId = String(formData.get("productId") ?? "");
  const actualQuantityRaw = String(formData.get("actualQuantity") ?? "").trim();
  const actualQuantity = Number(actualQuantityRaw);
  const reason = String(formData.get("reason") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!productId) return { error: "Select a product." };
  if (!actualQuantityRaw || !Number.isFinite(actualQuantity) || actualQuantity < 0) {
    return { error: "Physical quantity must be a number of 0 or more." };
  }
  if (!reason) return { error: "Select a reason." };

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { error: "Product not found." };

  const previousQuantity = product.currentStock;
  const difference = actualQuantity - previousQuantity;

  if (difference === 0) {
    return { error: "Physical count matches system stock — nothing to adjust." };
  }

  await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: { currentStock: actualQuantity },
    }),
    prisma.stockMovement.create({
      data: {
        productId,
        movementType: "STOCK_ADJUSTMENT",
        quantity: difference,
        previousQuantity,
        newQuantity: actualQuantity,
        reason,
        notes: notes || null,
      },
    }),
  ]);

  revalidateStockPaths(productId);
  redirect("/inventory/stock-history");
}
