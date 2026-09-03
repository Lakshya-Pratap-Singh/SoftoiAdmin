import { prisma } from "@/lib/prisma";

/** Generates the next sequential product code, e.g. SOF-0001, SOF-0002. */
export async function generateProductCode(): Promise<string> {
  const count = await prisma.product.count();
  return `SOF-${String(count + 1).padStart(4, "0")}`;
}

/** Generates the next sequential stall code, e.g. STL-0001. */
export async function generateStallCode(): Promise<string> {
  const count = await prisma.stall.count();
  return `STL-${String(count + 1).padStart(4, "0")}`;
}

/** Generates the next sequential order number, e.g. ORD-000001. */
export async function generateOrderNumber(): Promise<string> {
  const count = await prisma.order.count();
  return `ORD-${String(count + 1).padStart(6, "0")}`;
}
