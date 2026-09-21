// Runs the real service code against a real (throwaway) PostgreSQL database.
// Skipped unless TEST_DATABASE_URL is set — see test-db.ts.

import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";
import { createTestClient, integrationEnabled, resetDatabase, seedArtisan, seedOrder, seedProduct } from "./test-db";
import {
  FeedbackError,
  createQRForOrderItem,
  createQRsForOrder,
  disableQR,
  getOrderQRView,
  getPublicBrand,
  getQRDetail,
  getStats,
  listQRs,
  recordScan,
  recordWhatsappOpen,
  regenerateQR,
  resolvePublicFeedback,
} from "./service";
import { isValidTokenFormat } from "./token";

describe("artisan appreciation QR — service (real database)", { skip: !integrationEnabled }, () => {
  let db: PrismaClient;

  before(async () => {
    db = await createTestClient();
  });
  after(async () => {
    await db?.$disconnect();
  });
  beforeEach(async () => {
    await resetDatabase(db);
  });

  /** artisan + product + order + QR, the usual starting point. */
  async function setup(opts: Parameters<typeof seedArtisan>[1] = {}, productName = "Lilac Crochet Bouquet") {
    const artisan = await seedArtisan(db, opts);
    const product = await seedProduct(db, { name: productName, artisanId: artisan.id });
    const { order, items } = await seedOrder(db, [product.id]);
    const { qr } = await createQRForOrderItem(db, { orderItemId: items[0].id });
    return { artisan, product, order, item: items[0], qr };
  }

  // ---- Case 1 -------------------------------------------------------------
  test("case 1: valid QR → WhatsApp link with the artisan's number and a filled-in message", async () => {
    const { qr } = await setup();
    const r = await resolvePublicFeedback(db, qr.token);
    assert.equal(r.kind, "ok");
    if (r.kind !== "ok") return;
    assert.equal(r.productName, "Lilac Crochet Bouquet");
    assert.equal(r.artisanName, "Asha Sharma");
    const url = new URL(r.whatsappUrl);
    assert.equal(url.origin + url.pathname, "https://wa.me/919876543210");
    const text = url.searchParams.get("text")!;
    assert.match(text, /^Hi Asha Sharma! 💜/);
    assert.match(text, /my Softoi Lilac Crochet Bouquet/);
  });

  // ---- Case 2 -------------------------------------------------------------
  test("case 2: invalid tokens → 'invalid' (malformed, unknown, and injection attempts)", async () => {
    await setup();
    for (const t of ["", "short", "x".repeat(22), "../../etc/passwd", "a'; DROP TABLE artisan_feedback_qrs;--", "🧶".repeat(22)]) {
      assert.deepEqual(await resolvePublicFeedback(db, t), { kind: "invalid" }, JSON.stringify(t));
    }
    assert.equal(await db.artisanFeedbackQR.count(), 1, "table intact");
  });

  // ---- Case 3 -------------------------------------------------------------
  test("case 3: disabled QR → 'disabled', never a WhatsApp link, and its scans aren't counted", async () => {
    const { qr } = await setup();
    await disableQR(db, qr.id);
    const r = await resolvePublicFeedback(db, qr.token);
    assert.equal(r.kind, "disabled");
    assert.equal(JSON.stringify(r).includes("wa.me"), false);
    await recordScan(db, qr.token);
    await recordWhatsappOpen(db, qr.token);
    const after = await db.artisanFeedbackQR.findUniqueOrThrow({ where: { id: qr.id } });
    assert.equal(after.scanCount, 0);
    assert.equal(after.whatsappOpenCount, 0);
    assert.ok(after.disabledAt);
  });

  test("expired status is reported as 'expired'", async () => {
    const { qr } = await setup();
    await db.artisanFeedbackQR.update({ where: { id: qr.id }, data: { status: "EXPIRED" } });
    assert.equal((await resolvePublicFeedback(db, qr.token)).kind, "expired");
  });

  // ---- Case 4 -------------------------------------------------------------
  test("case 4: artisan has no WhatsApp number → 'unavailable', no URL generated", async () => {
    const { qr } = await setup({ whatsappNumber: null, phone: null });
    const r = await resolvePublicFeedback(db, qr.token);
    assert.equal(r.kind, "unavailable");
    if (r.kind === "unavailable") assert.equal(r.reason, "no_whatsapp");
    assert.equal(JSON.stringify(r).includes("wa.me"), false);
  });

  test("case 4b: invalid stored number → 'unavailable' (no wrong-number link)", async () => {
    const { qr } = await setup({ whatsappNumber: "call me maybe", phone: "9876543210" });
    const r = await resolvePublicFeedback(db, qr.token);
    assert.equal(r.kind, "unavailable");
    if (r.kind === "unavailable") assert.equal(r.reason, "invalid_whatsapp");
  });

  test("case 4c: no WhatsApp number but a valid phone → falls back to phone", async () => {
    const { qr } = await setup({ whatsappNumber: null, phone: "98765 43210" });
    const r = await resolvePublicFeedback(db, qr.token);
    assert.equal(r.kind, "ok");
    if (r.kind === "ok") assert.ok(r.whatsappUrl.startsWith("https://wa.me/919876543210?text="));
  });

  test("case 4d: the number is picked up at scan time — adding it later fixes already-printed QRs", async () => {
    const { qr, artisan } = await setup({ whatsappNumber: null, phone: null });
    assert.equal((await resolvePublicFeedback(db, qr.token)).kind, "unavailable");
    await db.artisan.update({ where: { id: artisan.id }, data: { whatsappNumber: "+919123456780" } });
    const r = await resolvePublicFeedback(db, qr.token);
    assert.equal(r.kind, "ok");
    if (r.kind === "ok") assert.ok(r.whatsappUrl.includes("wa.me/919123456780"));
  });

  // ---- Case 5 -------------------------------------------------------------
  test("case 5: special characters in artisan/product names → valid URL, exact round-trip", async () => {
    const { qr } = await setup({ name: `D'Souza "Dee" & Sons 🧶` }, `Bouquet #1 (Large) 100% wool + <bag> ?x=1&y=2 — आशा`);
    const r = await resolvePublicFeedback(db, qr.token);
    assert.equal(r.kind, "ok");
    if (r.kind !== "ok") return;
    const url = new URL(r.whatsappUrl);
    assert.deepEqual([...url.searchParams.keys()], ["text"]);
    const text = url.searchParams.get("text")!;
    assert.ok(text.includes(`D'Souza "Dee" & Sons 🧶`));
    assert.ok(text.includes(`Bouquet #1 (Large) 100% wool + <bag> ?x=1&y=2 — आशा`));
  });

  // ---- Case 6 -------------------------------------------------------------
  test("case 6: repeated scans increment the count; first stays fixed, last moves", async () => {
    const { qr } = await setup();
    await recordScan(db, qr.token);
    const one = await db.artisanFeedbackQR.findUniqueOrThrow({ where: { id: qr.id } });
    assert.equal(one.scanCount, 1);
    assert.ok(one.firstScannedAt && one.lastScannedAt);

    await new Promise((r) => setTimeout(r, 15));
    await recordScan(db, qr.token);
    await recordScan(db, qr.token);
    const three = await db.artisanFeedbackQR.findUniqueOrThrow({ where: { id: qr.id } });
    assert.equal(three.scanCount, 3);
    assert.equal(three.firstScannedAt!.getTime(), one.firstScannedAt!.getTime(), "first scan time never changes");
    assert.ok(three.lastScannedAt!.getTime() > one.lastScannedAt!.getTime(), "last scan time advances");
  });

  test("case 6b: 25 simultaneous scans are all counted (no lost updates)", async () => {
    const { qr } = await setup();
    await Promise.all(Array.from({ length: 25 }, () => recordScan(db, qr.token)));
    assert.equal((await db.artisanFeedbackQR.findUniqueOrThrow({ where: { id: qr.id } })).scanCount, 25);
  });

  test("scan vs WhatsApp-open are tracked separately, and there is no 'message sent' anywhere", async () => {
    const { qr } = await setup();
    await recordScan(db, qr.token);
    await recordScan(db, qr.token);
    await recordWhatsappOpen(db, qr.token);
    const row = await db.artisanFeedbackQR.findUniqueOrThrow({ where: { id: qr.id } });
    assert.equal(row.scanCount, 2);
    assert.equal(row.whatsappOpenCount, 1);
    assert.equal(Object.keys(row).some((k) => /sent|deliver/i.test(k)), false, "no fake delivery column");
    const stats = await getStats(db);
    assert.equal(Object.keys(stats).some((k) => /sent|deliver/i.test(k)), false);
  });

  test("scans of unknown or malformed tokens are ignored quietly", async () => {
    await setup();
    await recordScan(db, "not-a-token");
    await recordScan(db, "x".repeat(22));
    await recordWhatsappOpen(db, "../../x");
    assert.equal((await db.artisanFeedbackQR.aggregate({ _sum: { scanCount: true } }))._sum.scanCount, 0);
  });

  // ---- Case 8 -------------------------------------------------------------
  test("case 8: public result exposes no internal ids, order, customer or price data", async () => {
    const artisan = await seedArtisan(db);
    const product = await seedProduct(db, { artisanId: artisan.id, imageUrl: "https://img.example/x.jpg" });
    const { order, items, customer } = await seedOrder(db, [product.id], {
      customer: { name: "Rahul Verma", phone: "+919000011111", email: "rahul@example.com" },
    });
    const { qr } = await createQRForOrderItem(db, { orderItemId: items[0].id });

    const r = await resolvePublicFeedback(db, qr.token);
    assert.equal(r.kind, "ok");
    const json = JSON.stringify(r);
    for (const secret of [
      order.id, order.orderNumber, items[0].id, customer!.id,
      "Rahul", "rahul@example.com", "9000011111", product.id, artisan.id, artisan.code, "499",
    ]) {
      assert.equal(json.includes(secret), false, `public result leaked ${secret}`);
    }
    // ...and the token itself is opaque: no id fragments inside it.
    for (const id of [order.id, items[0].id, product.id, artisan.id, qr.id]) {
      assert.equal(qr.token.includes(id) || qr.token.includes(id.slice(-8)), false);
    }
    assert.ok(isValidTokenFormat(qr.token));
  });

  test("product image URLs are only passed on when http(s)", async () => {
    const a = await seedArtisan(db);
    const p = await seedProduct(db, { artisanId: a.id, imageUrl: "javascript:alert(1)" });
    const { items } = await seedOrder(db, [p.id]);
    const { qr } = await createQRForOrderItem(db, { orderItemId: items[0].id });
    const r = await resolvePublicFeedback(db, qr.token);
    assert.equal(r.kind === "ok" && r.productImageUrl, null);
  });

  // ---- Generation ---------------------------------------------------------
  test("generate: everything is derived from the order line (no manual entry)", async () => {
    const { qr, product, artisan, order, item } = await setup();
    assert.equal(qr.status, "ACTIVE");
    assert.equal(qr.product.id, product.id);
    assert.equal(qr.artisan.id, artisan.id);
    assert.equal(qr.orderId, order.id);
    assert.equal(qr.orderItemId, item.id);
    assert.equal(qr.scanCount, 0);
    assert.equal(qr.token.length, 22);
  });

  test("generate: idempotent — a second call returns the same QR", async () => {
    const { item, qr } = await setup();
    const again = await createQRForOrderItem(db, { orderItemId: item.id });
    assert.equal(again.created, false);
    assert.equal(again.qr.id, qr.id);
    assert.equal(await db.artisanFeedbackQR.count(), 1);
  });

  test("generate: 12 simultaneous clicks still produce exactly ONE active QR", async () => {
    const artisan = await seedArtisan(db);
    const product = await seedProduct(db, { artisanId: artisan.id });
    const { items } = await seedOrder(db, [product.id]);
    const results = await Promise.all(Array.from({ length: 12 }, () => createQRForOrderItem(db, { orderItemId: items[0].id })));
    assert.equal(results.filter((r) => r.created).length, 1);
    assert.equal(new Set(results.map((r) => r.qr.id)).size, 1);
    assert.equal(await db.artisanFeedbackQR.count({ where: { orderItemId: items[0].id, status: "ACTIVE" } }), 1);
  });

  test("generate: product without an artisan needs one chosen; a chosen one works", async () => {
    const artisan = await seedArtisan(db);
    const product = await seedProduct(db, { artisanId: null });
    const { items } = await seedOrder(db, [product.id]);
    await assert.rejects(createQRForOrderItem(db, { orderItemId: items[0].id }), (e) => e instanceof FeedbackError && e.code === "NO_ARTISAN");
    const { qr } = await createQRForOrderItem(db, { orderItemId: items[0].id, artisanId: artisan.id });
    assert.equal(qr.artisan.id, artisan.id);
  });

  test("generate: rejects cancelled/refunded orders, missing items, unlinked products, unknown artisans", async () => {
    const artisan = await seedArtisan(db);
    const product = await seedProduct(db, { artisanId: artisan.id });
    for (const status of ["CANCELLED", "REFUNDED"] as const) {
      const { items } = await seedOrder(db, [product.id], { status });
      await assert.rejects(createQRForOrderItem(db, { orderItemId: items[0].id }), (e) => e instanceof FeedbackError && e.code === "ORDER_NOT_ELIGIBLE");
    }
    await assert.rejects(createQRForOrderItem(db, { orderItemId: "nope" }), (e) => e instanceof FeedbackError && e.code === "ITEM_NOT_FOUND");
    const { items: orphan } = await seedOrder(db, [null]);
    await assert.rejects(createQRForOrderItem(db, { orderItemId: orphan[0].id }), (e) => e instanceof FeedbackError && e.code === "ITEM_HAS_NO_PRODUCT");
    const { items: ok } = await seedOrder(db, [product.id]);
    await assert.rejects(createQRForOrderItem(db, { orderItemId: ok[0].id, artisanId: "ghost" }), (e) => e instanceof FeedbackError && e.code === "ARTISAN_NOT_FOUND");
    assert.equal(await db.artisanFeedbackQR.count(), 0, "failed attempts leave nothing behind");
  });

  test("generate: QR keeps its artisan even if the product is reassigned afterwards", async () => {
    const { qr, product } = await setup();
    const other = await seedArtisan(db, { name: "Someone Else" });
    await db.product.update({ where: { id: product.id }, data: { artisanId: other.id } });
    const r = await resolvePublicFeedback(db, qr.token);
    assert.equal(r.kind === "ok" && r.artisanName, "Asha Sharma");
  });

  test("generate for a whole order: one call, skips lines it can't do, doesn't fail the rest", async () => {
    const a = await seedArtisan(db);
    const p1 = await seedProduct(db, { name: "One", artisanId: a.id });
    const p2 = await seedProduct(db, { name: "Two", artisanId: null }); // no artisan
    const p3 = await seedProduct(db, { name: "Three", artisanId: a.id });
    const { order, items } = await seedOrder(db, [p1.id, p2.id, p3.id]);
    const res = await createQRsForOrder(db, { orderId: order.id });
    assert.deepEqual(res.map((r) => r.outcome), ["created", "skipped", "created"]);
    assert.match(res[1].reason!, /no artisan/i);
    // Fixing the gap and running again only adds what's missing.
    const res2 = await createQRsForOrder(db, { orderId: order.id, artisanByItem: { [items[1].id]: a.id } });
    assert.deepEqual(res2.map((r) => r.outcome), ["existing", "created", "existing"]);
    assert.equal(await db.artisanFeedbackQR.count(), 3);
    await assert.rejects(createQRsForOrder(db, { orderId: "nope" }), (e) => e instanceof FeedbackError && e.code === "ORDER_NOT_FOUND");
  });

  // ---- Disable / regenerate ----------------------------------------------
  test("disable: idempotent; unknown id is a clear error", async () => {
    const { qr } = await setup();
    await disableQR(db, qr.id);
    const first = await db.artisanFeedbackQR.findUniqueOrThrow({ where: { id: qr.id } });
    await disableQR(db, qr.id);
    const second = await db.artisanFeedbackQR.findUniqueOrThrow({ where: { id: qr.id } });
    assert.equal(second.status, "DISABLED");
    assert.equal(second.disabledAt!.getTime(), first.disabledAt!.getTime());
    await assert.rejects(disableQR(db, "nope"), (e) => e instanceof FeedbackError && e.code === "QR_NOT_FOUND");
  });

  test("regenerate: old token dies, new one works, history is linked, scan counts start fresh", async () => {
    const { qr: old, item } = await setup();
    await recordScan(db, old.token);
    const fresh = await regenerateQR(db, old.id);

    assert.notEqual(fresh.token, old.token);
    assert.equal(fresh.status, "ACTIVE");
    assert.equal(fresh.scanCount, 0);
    assert.equal(fresh.regeneratedFromId, old.id);
    assert.equal(fresh.orderItemId, item.id);
    assert.equal((await resolvePublicFeedback(db, old.token)).kind, "disabled");
    assert.equal((await resolvePublicFeedback(db, fresh.token)).kind, "ok");
    assert.equal(await db.artisanFeedbackQR.count({ where: { orderItemId: item.id, status: "ACTIVE" } }), 1);

    const detail = await getQRDetail(db, old.id);
    assert.equal(detail?.regeneratedTo[0]?.id, fresh.id);
    // "Generate" after regenerating returns the new one, not a third.
    const again = await createQRForOrderItem(db, { orderItemId: item.id });
    assert.equal(again.qr.id, fresh.id);
  });

  test("regenerate: works on an already-disabled QR (lost-QR case)", async () => {
    const { qr } = await setup();
    await disableQR(db, qr.id);
    const fresh = await regenerateQR(db, qr.id);
    assert.equal(fresh.status, "ACTIVE");
  });

  test("regenerate: a stale second click is refused instead of creating a second active QR; racing clicks make one", async () => {
    const { qr, item } = await setup();
    const results = await Promise.allSettled([regenerateQR(db, qr.id), regenerateQR(db, qr.id), regenerateQR(db, qr.id)]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    for (const r of results) {
      if (r.status === "rejected") assert.ok(r.reason instanceof FeedbackError && r.reason.code === "ALREADY_REGENERATED");
    }
    assert.equal(await db.artisanFeedbackQR.count({ where: { orderItemId: item.id, status: "ACTIVE" } }), 1);
    await assert.rejects(regenerateQR(db, "nope"), (e) => e instanceof FeedbackError && e.code === "QR_NOT_FOUND");
  });

  // ---- Admin reads --------------------------------------------------------
  test("stats: totals, top products and top artisans — and no zero-scan noise", async () => {
    const a1 = await seedArtisan(db, { name: "Asha" });
    const a2 = await seedArtisan(db, { name: "Bina" });
    const p1 = await seedProduct(db, { name: "Bouquet", artisanId: a1.id });
    const p2 = await seedProduct(db, { name: "Tote", artisanId: a2.id });
    const p3 = await seedProduct(db, { name: "Never scanned", artisanId: a2.id });
    const { items } = await seedOrder(db, [p1.id, p2.id, p3.id]);
    const q1 = (await createQRForOrderItem(db, { orderItemId: items[0].id })).qr;
    const q2 = (await createQRForOrderItem(db, { orderItemId: items[1].id })).qr;
    await createQRForOrderItem(db, { orderItemId: items[2].id });
    for (let i = 0; i < 5; i++) await recordScan(db, q1.token);
    for (let i = 0; i < 2; i++) await recordScan(db, q2.token);
    await recordWhatsappOpen(db, q1.token);
    await disableQR(db, q2.id);

    const s = await getStats(db);
    assert.equal(s.totalQRs, 3);
    assert.equal(s.activeQRs, 2);
    assert.equal(s.totalScans, 7);
    assert.equal(s.totalWhatsappOpens, 1);
    assert.deepEqual(s.topProducts.map((p) => [p.name, p.scans]), [["Bouquet", 5], ["Tote", 2]]);
    assert.deepEqual(s.topArtisans.map((a) => [a.name, a.scans]), [["Asha", 5], ["Bina", 2]]);
  });

  test("stats: empty database is all zeros", async () => {
    assert.deepEqual(await getStats(db), { totalQRs: 0, activeQRs: 0, totalScans: 0, totalWhatsappOpens: 0, topProducts: [], topArtisans: [] });
  });

  test("list: newest first, filterable by status, and rows carry no customer data", async () => {
    const a = await seedArtisan(db);
    const p = await seedProduct(db, { artisanId: a.id });
    const { items } = await seedOrder(db, [p.id, p.id], { customer: { name: "Rahul", phone: "+919000011111", email: "r@example.com" } });
    const first = (await createQRForOrderItem(db, { orderItemId: items[0].id })).qr;
    const second = (await createQRForOrderItem(db, { orderItemId: items[1].id })).qr;
    await disableQR(db, first.id);
    assert.deepEqual((await listQRs(db)).map((q) => q.id), [second.id, first.id]);
    assert.deepEqual((await listQRs(db, { status: "DISABLED" })).map((q) => q.id), [first.id]);
    assert.equal(JSON.stringify(await listQRs(db)).includes("Rahul"), false);
  });

  test("order view: lines, assigned artisan, WhatsApp readiness and existing QR", async () => {
    const ready = await seedArtisan(db, { name: "Ready" });
    const notReady = await seedArtisan(db, { name: "NoNumber", whatsappNumber: null, phone: null });
    const p1 = await seedProduct(db, { name: "A", artisanId: ready.id });
    const p2 = await seedProduct(db, { name: "B", artisanId: notReady.id });
    const p3 = await seedProduct(db, { name: "C", artisanId: null });
    const { order, items } = await seedOrder(db, [p1.id, p2.id, p3.id]);
    await createQRForOrderItem(db, { orderItemId: items[0].id });

    const v = (await getOrderQRView(db, order.id))!;
    assert.equal(v.eligible, true);
    assert.deepEqual(v.items.map((i) => [i.productName, i.artisan?.name ?? null, i.artisan?.whatsappReady ?? null, Boolean(i.activeQR)]), [
      ["A", "Ready", true, true],
      ["B", "NoNumber", false, false],
      ["C", null, null, false],
    ]);
    assert.equal(await getOrderQRView(db, "nope"), null);
    const cancelled = await seedOrder(db, [p1.id], { status: "CANCELLED" });
    assert.equal((await getOrderQRView(db, cancelled.order.id))!.eligible, false);
  });

  test("brand: falls back to 'Softoi' with no settings row; only http(s) logos", async () => {
    assert.deepEqual(await getPublicBrand(db), { name: "Softoi", logoUrl: null });
    await db.settings.create({ data: { businessName: "Softoi Crafts", businessLogoUrl: "javascript:alert(1)" } });
    assert.deepEqual(await getPublicBrand(db), { name: "Softoi Crafts", logoUrl: null });
    await db.settings.updateMany({ data: { businessLogoUrl: "https://cdn.example/logo.png" } });
    assert.equal((await getPublicBrand(db)).logoUrl, "https://cdn.example/logo.png");
  });
});
