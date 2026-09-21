// Test helpers for the integration tests (not itself a test file).
//
// Integration tests run only when TEST_DATABASE_URL is set, and they REFUSE to
// run unless the database name contains "test" — they TRUNCATE tables, so a
// wrongly-set variable must never be able to touch a real database.
//
//   TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/softoi_test npm test
//
// Apply prisma/schema.prisma (or the SQL in prisma/sql/) to that database first.

import { PrismaClient } from "@prisma/client";

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
export const integrationEnabled = Boolean(TEST_DATABASE_URL);

function assertSafeTestDatabase(url: string) {
  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!/test/i.test(dbName)) {
    throw new Error(
      `Refusing to run integration tests against database "${dbName}": the name must contain "test" because these tests wipe tables.`
    );
  }
}

/**
 * Normal setups: a plain PrismaClient. Restricted/CI environments that can't
 * download Prisma's native engine can set TEST_PRISMA_ADAPTER=pg (requires
 * `npm i --no-save @prisma/adapter-pg pg` and a client generated with
 * engineType = "client"). Not needed for regular development.
 */
export async function createTestClient(): Promise<PrismaClient> {
  if (!TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is not set");
  assertSafeTestDatabase(TEST_DATABASE_URL);

  if (process.env.TEST_PRISMA_ADAPTER === "pg") {
    const specifier = "@prisma/adapter-pg"; // indirect so TypeScript doesn't require the package
    const { PrismaPg } = await import(specifier);
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }) } as never);
  }
  return new PrismaClient({ datasourceUrl: TEST_DATABASE_URL });
}

export async function resetDatabase(db: PrismaClient) {
  await db.$executeRawUnsafe(
    `TRUNCATE "artisan_feedback_qrs","order_items","orders","products","artisans","categories","customers","stalls","users","settings" RESTART IDENTITY CASCADE`
  );
}

let counter = 0;
const n = () => ++counter;

export async function seedArtisan(
  db: PrismaClient,
  overrides: Partial<{ name: string; code: string; whatsappNumber: string | null; phone: string | null; status: "ACTIVE" | "ARCHIVED" }> = {}
) {
  const i = n();
  return db.artisan.create({
    data: {
      code: overrides.code ?? `AR${String(i).padStart(2, "0")}`,
      name: overrides.name ?? "Asha Sharma",
      type: "INDEPENDENT",
      whatsappNumber: overrides.whatsappNumber === undefined ? "+919876543210" : overrides.whatsappNumber,
      phone: overrides.phone ?? null,
      status: overrides.status ?? "ACTIVE",
    },
  });
}

export async function seedProduct(
  db: PrismaClient,
  overrides: Partial<{ name: string; artisanId: string | null; imageUrl: string | null }> = {}
) {
  const i = n();
  return db.product.create({
    data: {
      productCode: `SOF-${String(i).padStart(4, "0")}`,
      name: overrides.name ?? "Lilac Crochet Bouquet",
      artisanId: overrides.artisanId === undefined ? null : overrides.artisanId,
      imageUrl: overrides.imageUrl ?? null,
      sellingPrice: 499,
    },
  });
}

/** An order with one line per productId (null = a line whose product was removed). */
export async function seedOrder(
  db: PrismaClient,
  productIds: Array<string | null>,
  overrides: Partial<{ status: "DRAFT" | "COMPLETED" | "CANCELLED" | "REFUNDED"; customer: { name: string; phone: string; email: string } }> = {}
) {
  const i = n();
  const customer = overrides.customer ? await db.customer.create({ data: overrides.customer }) : null;
  const order = await db.order.create({
    data: {
      orderNumber: `ORD-${String(i).padStart(6, "0")}`,
      salesChannel: "WEBSITE",
      status: overrides.status ?? "COMPLETED",
      paymentStatus: "PAID",
      subtotal: 499,
      total: 499,
      customerId: customer?.id ?? null,
    },
  });
  const items = [];
  for (const productId of productIds) {
    items.push(
      await db.orderItem.create({
        data: {
          orderId: order.id,
          productId,
          productNameSnapshot: "Snapshot name",
          quantity: 1,
          unitPrice: 499,
          total: 499,
        },
      })
    );
  }
  return { order, items, customer };
}
