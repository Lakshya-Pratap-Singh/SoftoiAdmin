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

  // If this is a finished product with a Bill of Materials, producing more
  // of it consumes its components proportionally (e.g. stocking in 4
  // bouquets that each use 0.5 of a wrap sheet consumes 2 sheets).
  // currentStock is a whole-number column, so a component's consumption is
  // rounded to the nearest whole unit — fractional BOM quantities (0.5,
  // 0.75) combine correctly across a batch, but a single unit whose BOM
  // usage isn't a whole number will round rather than track the exact
  // fractional remainder.
  const bom =
    product.productType === "FINISHED_PRODUCT"
      ? await prisma.productComponent.findMany({
          where: { finishedProductId: productId },
          include: { componentProduct: { select: { id: true, name: true, currentStock: true } } },
        })
      : [];

  const settings = await prisma.settings.findFirst();
  const allowNegative = settings?.allowNegativeStock ?? false;

  const consumption = bom
    .map((row) => ({
      componentId: row.componentProductId,
      componentName: row.componentProduct.name,
      currentStock: row.componentProduct.currentStock,
      consumed: Math.round(Number(row.quantity) * quantity),
    }))
    .filter((row) => row.consumed > 0);

  if (!allowNegative) {
    const short = consumption.find((row) => row.consumed > row.currentStock);
    if (short) {
      return {
        error: `Not enough "${short.componentName}" in stock — need ${short.consumed}, only ${short.currentStock} available.`,
      };
    }
  }

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
    ...consumption.flatMap((row) => [
      prisma.product.update({
        where: { id: row.componentId },
        data: { currentStock: row.currentStock - row.consumed },
      }),
      prisma.stockMovement.create({
        data: {
          productId: row.componentId,
          movementType: "COMPONENT_CONSUMED",
          quantity: -row.consumed,
          previousQuantity: row.currentStock,
          newQuantity: row.currentStock - row.consumed,
          reason: `Used to produce ${quantity} × ${product.name}`,
          referenceType: "PRODUCT",
          referenceId: productId,
        },
      }),
    ]),
  ]);

  revalidateStockPaths(productId);
  consumption.forEach((row) => revalidateStockPaths(row.componentId));
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