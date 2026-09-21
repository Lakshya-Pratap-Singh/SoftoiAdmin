import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_APPRECIATION_TEMPLATE,
  buildAppreciationMessage,
  buildWhatsAppUrl,
  renderTemplate,
  sanitizeName,
} from "./message";

test("message: default template fills artisan and product names", () => {
  const m = buildAppreciationMessage("Asha Sharma", "Lilac Crochet Bouquet");
  assert.match(m, /^Hi Asha Sharma! 💜/);
  assert.match(m, /my Softoi Lilac Crochet Bouquet and I absolutely loved it!/);
  assert.match(m, /Thank you for making something so special!$/);
  assert.doesNotMatch(m, /\{\{/);
});

test("message: contains no customer information (only the two names are substituted)", () => {
  const placeholders = [...DEFAULT_APPRECIATION_TEMPLATE.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(placeholders)].sort(), ["artisanName", "productName"]);
});

test("wa.me URL: shape, digits only, message round-trips exactly", () => {
  const msg = buildAppreciationMessage("Asha", "Bouquet");
  const url = buildWhatsAppUrl("919876543210", msg);
  assert.ok(url.startsWith("https://wa.me/919876543210?text="));
  const parsed = new URL(url);
  assert.equal(parsed.hostname, "wa.me");
  assert.equal(parsed.pathname, "/919876543210");
  assert.equal(parsed.searchParams.get("text"), msg); // decodes back to the exact message
  assert.ok(url.includes("%0A%0A"), "blank lines are encoded as %0A");
  assert.doesNotMatch(url, /[\s\n]/, "no raw whitespace in URL");
});

test("special characters in names keep the URL valid and can't inject parameters", () => {
  const nasty = [
    ["Asha & Sons", "Bouquet #1 (Large) 100% wool"],
    ["D'Souza \"Dee\"", "Tote <bag> + strap = ?x=1&y=2"],
    ["Zoë Müller-Ñandú", "Ünïcödé Pärcel"],
    ["आशा शर्मा", "क्रोशिया गुलदस्ता"],
    ["Kavya 🧶", "Bunny 🐰✨ #cute"],
    ["Line\nBreak\tTab", "Multi\r\nline"],
    ["a".repeat(500), "b".repeat(500)],
  ] as const;
  for (const [artisan, product] of nasty) {
    const msg = buildAppreciationMessage(artisan, product);
    const url = buildWhatsAppUrl("919876543210", msg);
    const parsed = new URL(url); // throws if malformed
    assert.equal(parsed.host, "wa.me");
    assert.deepEqual([...parsed.searchParams.keys()], ["text"], "only the text param may exist");
    assert.equal(parsed.searchParams.get("text"), msg);
    assert.ok(url.length < 2000, "stays a reasonable length");
  }
});

test("names: whitespace collapsed, control/bidi chars stripped, truncated by code point", () => {
  assert.equal(sanitizeName("  A \n\t B  "), "A B");
  assert.equal(sanitizeName("a\u202Ebc\u2066d"), "a bc d");
  assert.equal(sanitizeName(null), "");
  const truncated = sanitizeName("🧶".repeat(200), 10);
  assert.equal(Array.from(truncated).length, 10);
  assert.ok(truncated.endsWith("…"));
  assert.doesNotMatch(truncated, /\uFFFD/, "emoji never split into broken surrogates");
});

test("template: single pass — a product named like a placeholder is not re-expanded", () => {
  const out = renderTemplate("{{a}} / {{b}}", { a: "{{b}}", b: "X" });
  assert.equal(out, "{{b}} / X");
  assert.equal(renderTemplate("{{unknown}}", {}), "{{unknown}}");
});

test("message: empty names fall back to neutral wording, never 'undefined'", () => {
  const m = buildAppreciationMessage("", "   ");
  assert.match(m, /^Hi there! 💜/);
  assert.match(m, /my Softoi product/);
  assert.doesNotMatch(m, /undefined|null/);
});

test("wa.me URL: refuses to build a link from a bad number", () => {
  for (const bad of ["", "abc", "+919876543210", "91 9876543210", "0919876543210", "123", "9".repeat(16), "919876543210/../x"]) {
    assert.throws(() => buildWhatsAppUrl(bad, "hi"), /international format/, `should reject ${JSON.stringify(bad)}`);
  }
});
