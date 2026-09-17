import { prisma } from "@/lib/prisma";

/** Generates the next sequential product code, e.g. SOF-0001, SOF-0002. */
export async function generateProductCode(): Promise<string> {
  const count = await prisma.product.count();
  return `SOF-${String(count + 1).padStart(4, "0")}`;
}

/**
 * Generates a SKU in the "SKU-001" style your import sheets already use.
 * Checks for a free one rather than trusting count() alone, since manually
 * entered or imported SKUs can already occupy a number the count would
 * otherwise reuse.
 */
export async function generateSku(): Promise<string> {
  let n = await prisma.product.count();
  let sku = `SKU-${String(n + 1).padStart(3, "0")}`;
  while (await prisma.product.findUnique({ where: { sku } })) {
    n += 1;
    sku = `SKU-${String(n + 1).padStart(3, "0")}`;
  }
  return sku;
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

/**
 * Generates an artisan code from their name's initials plus a 2-digit
 * sequence scoped to that same initials pair — e.g. "Amit Bhatt" and
 * "Anil Bora" both start "AB", so they become AB01, AB02, etc.
 */
export async function generateArtisanCode(name: string): Promise<string> {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstInitial = (parts[0]?.[0] ?? "X").toUpperCase();
  const lastInitial = (parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] ?? parts[0]?.[0] ?? "X").toUpperCase();
  const prefix = `${firstInitial}${lastInitial}`;
  const count = await prisma.artisan.count({ where: { code: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(2, "0")}`;
}