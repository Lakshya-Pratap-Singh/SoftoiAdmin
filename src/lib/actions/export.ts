"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Converts Decimal/Date fields (which can't cross the server action
// boundary as-is) into plain strings, and drops nothing — every column
// on every table comes through so the export genuinely matches the schema.
function serialize<T extends Record<string, unknown>>(row: T): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) out[key] = null;
    else if (value instanceof Date) out[key] = value.toISOString();
    else if (typeof value === "object" && "toString" in value && (value as { constructor: { name: string } }).constructor.name === "Decimal") {
      out[key] = (value as { toString(): string }).toString();
    } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    } else {
      out[key] = JSON.stringify(value);
    }
  }
  return out;
}

export type TableExport = { name: string; rows: Record<string, string | number | boolean | null>[] };

/** Fetches every row from every table, for the full Power BI-ready export. */
export async function exportAllData(): Promise<{ tables: TableExport[] } | { error: string }> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in." };

  const [
    users,
    categories,
    artisans,
    products,
    productComponents,
    stockMovements,
    customers,
    stalls,
    orders,
    orderItems,
    settings,
  ] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.category.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.artisan.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.product.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.productComponent.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.stockMovement.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.customer.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.stall.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.order.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.orderItem.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.settings.findMany(),
  ]);

  // passwordHash never leaves the server, even in an internal export
  const usersSafe = users.map(({ passwordHash: _passwordHash, ...rest }) => rest);

  return {
    tables: [
      { name: "users", rows: usersSafe.map(serialize) },
      { name: "categories", rows: categories.map(serialize) },
      { name: "artisans", rows: artisans.map(serialize) },
      { name: "products", rows: products.map(serialize) },
      { name: "product_components", rows: productComponents.map(serialize) },
      { name: "stock_movements", rows: stockMovements.map(serialize) },
      { name: "customers", rows: customers.map(serialize) },
      { name: "stalls", rows: stalls.map(serialize) },
      { name: "orders", rows: orders.map(serialize) },
      { name: "order_items", rows: orderItems.map(serialize) },
      { name: "settings", rows: settings.map(serialize) },
    ],
  };
}