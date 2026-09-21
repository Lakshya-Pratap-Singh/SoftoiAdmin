import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, resolveArtisanWhatsapp } from "./phone";

const ok: Array<[string, string]> = [
  ["+919876543210", "919876543210"],
  ["+91 98765 43210", "919876543210"],
  ["+91-98765-43210", "919876543210"],
  ["+91 (98765) 43210", "919876543210"],
  ["9876543210", "919876543210"],
  ["98765 43210", "919876543210"],
  ["09876543210", "919876543210"],
  ["919876543210", "919876543210"],
  ["0091 98765 43210", "919876543210"],
  ["+91 0 98765 43210", "919876543210"], // stray trunk zero
  ["  +919876543210  ", "919876543210"],
  ["+1 415 555 2671", "14155552671"], // non-Indian numbers need an explicit +
  ["+44 7911 123456", "447911123456"],
];
for (const [input, digits] of ok) {
  test(`phone: ${JSON.stringify(input)} → ${digits}`, () => {
    const n = normalizePhone(input);
    assert.ok(n, "should normalise");
    assert.equal(n.digits, digits);
    assert.equal(n.e164, `+${digits}`);
  });
}

const bad = [
  "", "   ", null, undefined,
  "12345", "98765", // too short
  "5876543210", // Indian mobiles start 6-9 — ambiguous without +, so refuse
  "4155552671", // 10 digits, not Indian, no country code → refuse to guess
  "+91 12345 67890", // +91 but not a valid Indian mobile
  "+919876543", // too short
  "+9198765432101234", // too long
  "abc", "98765 43210 (Asha)", "9876543210x", "9876-543-210 ext 5",
  "+", "++919876543210", "91+9876543210", "+0919876543210",
  "+1234567", // < 8 digits
];
for (const input of bad) {
  test(`phone: rejects ${JSON.stringify(input)}`, () => {
    assert.equal(normalizePhone(input as string | null | undefined), null);
  });
}

test("resolveArtisanWhatsapp: explicit WhatsApp number wins over phone", () => {
  const r = resolveArtisanWhatsapp({ whatsappNumber: "+919111111111", phone: "9222222222" });
  assert.equal(r.source, "whatsappNumber");
  assert.equal(r.number?.digits, "919111111111");
});

test("resolveArtisanWhatsapp: falls back to phone ONLY when no WhatsApp number was entered", () => {
  const r = resolveArtisanWhatsapp({ whatsappNumber: "", phone: "98765 43210" });
  assert.equal(r.source, "phone");
  assert.equal(r.number?.digits, "919876543210");
});

test("resolveArtisanWhatsapp: an invalid WhatsApp number does NOT silently fall back to phone", () => {
  const r = resolveArtisanWhatsapp({ whatsappNumber: "not a number", phone: "9876543210" });
  assert.equal(r.source, "whatsappNumber");
  assert.equal(r.number, null);
});

test("resolveArtisanWhatsapp: nothing on file", () => {
  assert.deepEqual(resolveArtisanWhatsapp({ whatsappNumber: null, phone: null }), { number: null, source: "none" });
});
