"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/id-generators";
import type { ActionState } from "@/lib/actions/categories";

type CartItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
};

export async function createOrder(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const itemsRaw = String(formData.get("items") ?? "[]");
  let items: CartItem[] = [];
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    return { error: "Cart data was invalid. Please try again." };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "Add at least one product to the cart." };
  }

  const salesChannel = String(formData.get("salesChannel") ?? "OFFLINE_STALL");
  const stallId = String(formData.get("stallId") ?? "").trim();
  const paymentMethod = String(formData.get("paymentMethod") ?? "CASH");
  const orderDiscount = Number(formData.get("orderDiscount") ?? 0) || 0;
  const notes = String(formData.get("notes") ?? "").trim();
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const customerEmail = String(formData.get("customerEmail") ?? "").trim();

  const settings = await prisma.settings.findFirst();
  const allowNegative = settings?.allowNegativeStock ?? false;

  try {
    const order = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: items.map((i) => i.productId) } },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      // Validate stock for every line before making any changes
      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product) throw new Error(`Product not found.`);
        if (!allowNegative && item.quantity > product.currentStock) {
          throw new Error(`Insufficient stock for ${product.name}.`);
        }
      }

      const subtotal = items.reduce(
        (sum, i) => sum + i.unitPrice * i.quantity - i.discount,
        0
      );
      const total = Math.max(subtotal - orderDiscount, 0);

      let customerId: string | null = null;
      if (customerName) {
        const customer = await tx.customer.create({
          data: {
            name: customerName,
            phone: customerPhone || null,
            email: customerEmail || null,
          },
        });
        customerId = customer.id;
      }

      const orderNumber = await generateOrderNumber();
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          salesChannel: salesChannel as never,
          stallId: stallId || null,
          status: "COMPLETED",
          paymentStatus: "PAID",
          paymentMethod: paymentMethod as never,
          subtotal,
          discount: orderDiscount,
          total,
          notes: notes || null,
        },
      });

      for (const item of items) {
        const product = productMap.get(item.productId)!;
        const itemTotal = item.unitPrice * item.quantity - item.discount;

        await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            productId: product.id,
            productNameSnapshot: product.name,
            skuSnapshot: product.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            total: itemTotal,
          },
        });

        const previousQuantity = product.currentStock;
        const newQuantity = previousQuantity - item.quantity;

        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: newQuantity },
        });

        await tx.stockMovement.create({
          data: {
            productId: product.id,
            movementType: "POS_SALE",
            quantity: -item.quantity,
            previousQuantity,
            newQuantity,
            reason: "POS Sale",
            referenceType: "ORDER",
            referenceId: createdOrder.id,
          },
        });

        // Keep productMap in sync in case the same product appears twice in the cart
        productMap.set(product.id, { ...product, currentStock: newQuantity });
      }

      return createdOrder;
    });

    revalidatePath("/orders");
    revalidatePath("/inventory");
    revalidatePath("/inventory/stock-history");
    revalidatePath("/inventory/low-stock");
    revalidatePath("/products");
    revalidatePath("/");
    redirect(`/orders/${order.id}`);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Insufficient")) {
      return { error: err.message };
    }
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    return { error: "Something went wrong completing the sale. Please try again." };
  }
}

export async function cancelOrder(id: string) {
  "use server";

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order || order.status !== "COMPLETED") return;

    await tx.order.update({ where: { id }, data: { status: "CANCELLED" } });

    for (const item of order.items) {
      if (!item.productId) continue;
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;

      const previousQuantity = product.currentStock;
      const newQuantity = previousQuantity + item.quantity;

      await tx.product.update({
        where: { id: product.id },
        data: { currentStock: newQuantity },
      });

      await tx.stockMovement.create({
        data: {
          productId: product.id,
          movementType: "STOCK_RESTORATION",
          quantity: item.quantity,
          previousQuantity,
          newQuantity,
          reason: "Order cancelled",
          referenceType: "ORDER",
          referenceId: order.id,
        },
      });
    }
  });

  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  revalidatePath("/inventory");
  revalidatePath("/inventory/stock-history");
  revalidatePath("/inventory/low-stock");
  revalidatePath("/products");
  revalidatePath("/");
}
