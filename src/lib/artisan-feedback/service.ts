// Artisan Appreciation QR — database logic.
//
// Every function takes the Prisma client as its first argument instead of
// importing the app-wide singleton. That keeps this module free of side
// effects at import time and lets the integration tests run the exact same
// code against a throwaway database.

import type { Prisma, PrismaClient } from "@prisma/client";
import { generateToken, isValidTokenFormat } from "./token";
import { resolveArtisanWhatsapp } from "./phone";
import { buildAppreciationMessage, buildWhatsAppUrl } from "./message";

type Db = PrismaClient;

// ---------------------------------------------------------------------------
// Errors (admin-facing: messages are written to be shown as-is)
// ---------------------------------------------------------------------------

export type FeedbackErrorCode =
  | "ORDER_NOT_FOUND"
  | "ITEM_NOT_FOUND"
  | "ORDER_NOT_ELIGIBLE"
  | "ITEM_HAS_NO_PRODUCT"
  | "NO_ARTISAN"
  | "ARTISAN_NOT_FOUND"
  | "QR_NOT_FOUND"
  | "ALREADY_REGENERATED";

export class FeedbackError extends Error {
  constructor(
    public readonly code: FeedbackErrorCode,
    message: string
  ) {
    super(message);
    this.name = "FeedbackError";
  }
}

// ---------------------------------------------------------------------------
// Shared shapes
// ---------------------------------------------------------------------------

/** What the admin screens need for one QR. Never includes customer data. */
export const QR_LIST_SELECT = {
  id: true,
  token: true,
  status: true,
  scanCount: true,
  whatsappOpenCount: true,
  firstScannedAt: true,
  lastScannedAt: true,
  lastWhatsappOpenAt: true,
  createdAt: true,
  disabledAt: true,
  orderId: true,
  orderItemId: true,
  regeneratedFromId: true,
  order: { select: { id: true, orderNumber: true } },
  product: { select: { id: true, name: true, imageUrl: true } },
  artisan: { select: { id: true, code: true, name: true, whatsappNumber: true, phone: true } },
} satisfies Prisma.ArtisanFeedbackQRSelect;

export type QRListRow = Prisma.ArtisanFeedbackQRGetPayload<{ select: typeof QR_LIST_SELECT }>;

/** True when the artisan has a usable WhatsApp number (so scans will work). */
export function isWhatsappReady(artisan: { whatsappNumber?: string | null; phone?: string | null }): boolean {
  return resolveArtisanWhatsapp(artisan).number !== null;
}

/** Short, human-friendly reference for tables (the real id stays internal). */
export function qrReference(id: string): string {
  return `QR-${id.slice(-8).toUpperCase()}`;
}

const TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 }; // same allowance the order code gives Neon

// ---------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------

export type GenerateInput = {
  orderItemId: string;
  /** Only needed when the product has no artisan assigned (or to override it). */
  artisanId?: string | null;
  createdById?: string | null;
};

/**
 * Creates the QR for one order line — or returns the one that already exists.
 * Everything (artisan, product, order) is derived from the order item, so
 * nobody has to type any of it in.
 *
 * Idempotent and safe under double-clicks / two people at once: an advisory
 * lock scoped to this order item serialises concurrent requests, so we can
 * never end up with two ACTIVE QRs for the same line.
 */
export async function createQRForOrderItem(
  db: Db,
  input: GenerateInput
): Promise<{ qr: QRListRow; created: boolean }> {
  return db.$transaction(async (tx) => {
    await lockOrderItem(tx, input.orderItemId);

    const item = await tx.orderItem.findUnique({
      where: { id: input.orderItemId },
      select: {
        id: true,
        orderId: true,
        productId: true,
        order: { select: { status: true } },
        product: { select: { id: true, artisanId: true } },
      },
    });
    if (!item) throw new FeedbackError("ITEM_NOT_FOUND", "That order item no longer exists.");
    if (item.order.status === "CANCELLED" || item.order.status === "REFUNDED") {
      throw new FeedbackError("ORDER_NOT_ELIGIBLE", "This order was cancelled or refunded, so it can't get a QR code.");
    }
    if (!item.productId || !item.product) {
      throw new FeedbackError("ITEM_HAS_NO_PRODUCT", "This order line isn't linked to a product, so the artisan can't be found.");
    }

    const existing = await tx.artisanFeedbackQR.findFirst({
      where: { orderItemId: item.id, status: "ACTIVE" },
      select: QR_LIST_SELECT,
    });
    if (existing) return { qr: existing, created: false };

    const artisanId = input.artisanId || item.product.artisanId;
    if (!artisanId) {
      throw new FeedbackError("NO_ARTISAN", "This product has no artisan assigned yet. Choose an artisan first.");
    }
    const artisan = await tx.artisan.findUnique({ where: { id: artisanId }, select: { id: true } });
    if (!artisan) throw new FeedbackError("ARTISAN_NOT_FOUND", "That artisan no longer exists.");

    const qr = await tx.artisanFeedbackQR.create({
      data: {
        token: generateToken(),
        orderId: item.orderId,
        orderItemId: item.id,
        productId: item.productId,
        artisanId: artisan.id,
        createdById: input.createdById ?? null,
      },
      select: QR_LIST_SELECT,
    });
    return { qr, created: true };
  }, TX_OPTIONS);
}

export type OrderGenerateResult = {
  orderItemId: string;
  outcome: "created" | "existing" | "skipped";
  reason?: string;
};

/** One click for the whole order: a QR for every line that can have one. */
export async function createQRsForOrder(
  db: Db,
  input: { orderId: string; artisanByItem?: Record<string, string | undefined>; createdById?: string | null }
): Promise<OrderGenerateResult[]> {
  const order = await db.order.findUnique({
    where: { id: input.orderId },
    select: { id: true, items: { select: { id: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!order) throw new FeedbackError("ORDER_NOT_FOUND", "That order no longer exists.");

  const results: OrderGenerateResult[] = [];
  for (const item of order.items) {
    try {
      const { created } = await createQRForOrderItem(db, {
        orderItemId: item.id,
        artisanId: input.artisanByItem?.[item.id] || null,
        createdById: input.createdById,
      });
      results.push({ orderItemId: item.id, outcome: created ? "created" : "existing" });
    } catch (err) {
      if (err instanceof FeedbackError) {
        // A line we can't do (no artisan, no product…) must not block the rest.
        results.push({ orderItemId: item.id, outcome: "skipped", reason: err.message });
        continue;
      }
      throw err;
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Disable / regenerate
// ---------------------------------------------------------------------------

/** Disabled QRs stop resolving immediately. Idempotent. */
export async function disableQR(db: Db, id: string): Promise<void> {
  const result = await db.artisanFeedbackQR.updateMany({
    where: { id, status: { not: "DISABLED" } },
    data: { status: "DISABLED", disabledAt: new Date() },
  });
  if (result.count === 0) {
    const exists = await db.artisanFeedbackQR.count({ where: { id } });
    if (!exists) throw new FeedbackError("QR_NOT_FOUND", "That QR code no longer exists.");
  }
}

/**
 * Replaces a lost or damaged QR: the old token is disabled (so a stray copy
 * stops working) and a fresh ACTIVE QR is created for the same order line,
 * product and artisan. Both happen in one transaction.
 */
export async function regenerateQR(db: Db, id: string, createdById?: string | null): Promise<QRListRow> {
  return db.$transaction(async (tx) => {
    const old = await tx.artisanFeedbackQR.findUnique({ where: { id } });
    if (!old) throw new FeedbackError("QR_NOT_FOUND", "That QR code no longer exists.");

    if (old.orderItemId) {
      await lockOrderItem(tx, old.orderItemId); // same lock as generate
      // Someone else may have regenerated it while this page was open.
      const newer = await tx.artisanFeedbackQR.findFirst({
        where: { orderItemId: old.orderItemId, status: "ACTIVE", id: { not: old.id } },
        select: { id: true },
      });
      if (newer) {
        throw new FeedbackError("ALREADY_REGENERATED", "This QR has already been replaced by a newer one. Use the newer code.");
      }
    }

    await tx.artisanFeedbackQR.update({
      where: { id: old.id },
      data: { status: "DISABLED", disabledAt: old.disabledAt ?? new Date() },
    });

    return tx.artisanFeedbackQR.create({
      data: {
        token: generateToken(),
        orderId: old.orderId,
        orderItemId: old.orderItemId,
        productId: old.productId,
        artisanId: old.artisanId,
        regeneratedFromId: old.id,
        createdById: createdById ?? null,
      },
      select: QR_LIST_SELECT,
    });
  }, TX_OPTIONS);
}

async function lockOrderItem(tx: Prisma.TransactionClient, orderItemId: string) {
  // Transaction-scoped: released automatically on commit/rollback.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"artisan-feedback-qr:" + orderItemId}))`;
}

// ---------------------------------------------------------------------------
// Public scan / redirect (the customer-facing side)
// ---------------------------------------------------------------------------

export type PublicFeedbackResult =
  | { kind: "invalid" }
  | { kind: "disabled"; qrId: string }
  | { kind: "expired"; qrId: string }
  | { kind: "unavailable"; qrId: string; artisanCode: string; reason: "no_whatsapp" | "invalid_whatsapp" }
  | {
      kind: "ok";
      qrId: string;
      productName: string;
      productImageUrl: string | null;
      artisanName: string;
      whatsappUrl: string;
    };

/**
 * Turns a public token into what the customer page may show.
 *
 * Deliberately selects ONLY product name/image and the artisan's name and
 * number — never the order, customer, prices or internal ids — so there is
 * nothing else it could leak.
 */
export async function resolvePublicFeedback(db: Db, token: string): Promise<PublicFeedbackResult> {
  if (!isValidTokenFormat(token)) return { kind: "invalid" };

  const qr = await db.artisanFeedbackQR.findUnique({
    where: { token },
    select: {
      id: true,
      status: true,
      product: { select: { name: true, imageUrl: true } },
      artisan: { select: { code: true, name: true, whatsappNumber: true, phone: true } },
    },
  });
  if (!qr) return { kind: "invalid" };
  if (qr.status === "DISABLED") return { kind: "disabled", qrId: qr.id };
  if (qr.status === "EXPIRED") return { kind: "expired", qrId: qr.id };

  const { number, source } = resolveArtisanWhatsapp(qr.artisan);
  if (!number) {
    return {
      kind: "unavailable",
      qrId: qr.id,
      artisanCode: qr.artisan.code,
      reason: source === "none" ? "no_whatsapp" : "invalid_whatsapp",
    };
  }

  const message = buildAppreciationMessage(qr.artisan.name, qr.product.name);
  return {
    kind: "ok",
    qrId: qr.id,
    productName: qr.product.name,
    productImageUrl: safeHttpUrl(qr.product.imageUrl),
    artisanName: qr.artisan.name,
    whatsappUrl: buildWhatsAppUrl(number.digits, message),
  };
}

/** Only ever hand http(s) image URLs to the public page. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Counts a page view ("QR scanned") — active QRs only. */
export async function recordScan(db: Db, token: string): Promise<void> {
  if (!isValidTokenFormat(token)) return;
  const now = new Date();
  await db.artisanFeedbackQR.updateMany({
    where: { token, status: "ACTIVE" },
    data: { scanCount: { increment: 1 }, lastScannedAt: now },
  });
  await db.artisanFeedbackQR.updateMany({
    where: { token, status: "ACTIVE", firstScannedAt: null },
    data: { firstScannedAt: now },
  });
}

/**
 * Counts a tap on the "Thank the Artisan on WhatsApp" button. This means the
 * customer was sent to WhatsApp — it does NOT mean a message was sent; with a
 * wa.me link that can't be known, so it is never reported as such.
 */
export async function recordWhatsappOpen(db: Db, token: string): Promise<void> {
  if (!isValidTokenFormat(token)) return;
  await db.artisanFeedbackQR.updateMany({
    where: { token, status: "ACTIVE" },
    data: { whatsappOpenCount: { increment: 1 }, lastWhatsappOpenAt: new Date() },
  });
}

/** Logo/name for the public page. Never throws — branding must not break the thank-you page. */
export async function getPublicBrand(db: Db): Promise<{ name: string; logoUrl: string | null }> {
  try {
    const s = await db.settings.findFirst({ select: { businessName: true, businessLogoUrl: true } });
    return { name: s?.businessName?.trim() || "Softoi", logoUrl: safeHttpUrl(s?.businessLogoUrl) };
  } catch {
    return { name: "Softoi", logoUrl: null };
  }
}

// ---------------------------------------------------------------------------
// Admin reads
// ---------------------------------------------------------------------------

export async function listQRs(
  db: Db,
  opts: { status?: "ACTIVE" | "DISABLED" | "EXPIRED"; orderId?: string; take?: number } = {}
): Promise<QRListRow[]> {
  return db.artisanFeedbackQR.findMany({
    where: { ...(opts.status ? { status: opts.status } : {}), ...(opts.orderId ? { orderId: opts.orderId } : {}) },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 200,
    select: QR_LIST_SELECT,
  });
}

export async function getQRDetail(db: Db, id: string) {
  return db.artisanFeedbackQR.findUnique({
    where: { id },
    select: {
      ...QR_LIST_SELECT,
      createdBy: { select: { name: true } },
      regeneratedFrom: { select: { id: true } },
      regeneratedTo: { select: { id: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" } },
    },
  });
}

export type QRStats = {
  totalQRs: number;
  activeQRs: number;
  totalScans: number;
  totalWhatsappOpens: number;
  topProducts: Array<{ productId: string; name: string; scans: number }>;
  topArtisans: Array<{ artisanId: string; name: string; code: string; scans: number }>;
};

export async function getStats(db: Db): Promise<QRStats> {
  const [totalQRs, activeQRs, sums, byProduct, byArtisan] = await Promise.all([
    db.artisanFeedbackQR.count(),
    db.artisanFeedbackQR.count({ where: { status: "ACTIVE" } }),
    db.artisanFeedbackQR.aggregate({ _sum: { scanCount: true, whatsappOpenCount: true } }),
    db.artisanFeedbackQR.groupBy({
      by: ["productId"],
      _sum: { scanCount: true },
      having: { scanCount: { _sum: { gt: 0 } } },
      orderBy: { _sum: { scanCount: "desc" } },
      take: 5,
    }),
    db.artisanFeedbackQR.groupBy({
      by: ["artisanId"],
      _sum: { scanCount: true },
      having: { scanCount: { _sum: { gt: 0 } } },
      orderBy: { _sum: { scanCount: "desc" } },
      take: 5,
    }),
  ]);

  const [products, artisans] = await Promise.all([
    db.product.findMany({ where: { id: { in: byProduct.map((r) => r.productId) } }, select: { id: true, name: true } }),
    db.artisan.findMany({ where: { id: { in: byArtisan.map((r) => r.artisanId) } }, select: { id: true, name: true, code: true } }),
  ]);
  const productName = new Map(products.map((p) => [p.id, p.name]));
  const artisanInfo = new Map(artisans.map((a) => [a.id, a]));

  return {
    totalQRs,
    activeQRs,
    totalScans: sums._sum.scanCount ?? 0,
    totalWhatsappOpens: sums._sum.whatsappOpenCount ?? 0,
    topProducts: byProduct.map((r) => ({
      productId: r.productId,
      name: productName.get(r.productId) ?? "Unknown product",
      scans: r._sum.scanCount ?? 0,
    })),
    topArtisans: byArtisan.map((r) => ({
      artisanId: r.artisanId,
      name: artisanInfo.get(r.artisanId)?.name ?? "Unknown artisan",
      code: artisanInfo.get(r.artisanId)?.code ?? "",
      scans: r._sum.scanCount ?? 0,
    })),
  };
}

export type OrderQRItemView = {
  itemId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  artisan: { id: string; code: string; name: string; whatsappReady: boolean } | null;
  activeQR: { id: string; scanCount: number; whatsappOpenCount: number } | null;
};

export type OrderQRView = {
  order: { id: string; orderNumber: string; status: string };
  eligible: boolean;
  items: OrderQRItemView[];
};

/** Order → items → product → artisan → existing QR, in one shot, for the packing screen. */
export async function getOrderQRView(db: Db, orderId: string): Promise<OrderQRView | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          productId: true,
          productNameSnapshot: true,
          quantity: true,
          product: {
            select: {
              name: true,
              artisan: { select: { id: true, code: true, name: true, whatsappNumber: true, phone: true } },
            },
          },
        },
      },
    },
  });
  if (!order) return null;

  const qrs = await db.artisanFeedbackQR.findMany({
    where: { orderItemId: { in: order.items.map((i) => i.id) }, status: "ACTIVE" },
    select: { id: true, orderItemId: true, scanCount: true, whatsappOpenCount: true },
  });
  const qrByItem = new Map(qrs.map((q) => [q.orderItemId, q]));

  return {
    order: { id: order.id, orderNumber: order.orderNumber, status: order.status },
    eligible: order.status !== "CANCELLED" && order.status !== "REFUNDED",
    items: order.items.map((i) => {
      const a = i.product?.artisan ?? null;
      const qr = qrByItem.get(i.id);
      return {
        itemId: i.id,
        productId: i.productId,
        productName: i.product?.name ?? i.productNameSnapshot,
        quantity: i.quantity,
        artisan: a ? { id: a.id, code: a.code, name: a.name, whatsappReady: isWhatsappReady(a) } : null,
        activeQR: qr ? { id: qr.id, scanCount: qr.scanCount, whatsappOpenCount: qr.whatsappOpenCount } : null,
      };
    }),
  };
}

/** Recent orders that can still get QR codes, for the "pick an order" list. */
export async function listOrdersForPicker(db: Db, take = 100) {
  return db.order.findMany({
    where: { status: { in: ["COMPLETED", "DRAFT"] } },
    orderBy: { orderDate: "desc" },
    take,
    select: {
      id: true,
      orderNumber: true,
      orderDate: true,
      customer: { select: { name: true } },
      _count: { select: { items: true } },
    },
  });
}

export async function listAssignableArtisans(db: Db) {
  return db.artisan.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, code: true, name: true },
  });
}
