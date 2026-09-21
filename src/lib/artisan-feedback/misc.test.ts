import { test } from "node:test";
import assert from "node:assert/strict";
import { isLikelyBot } from "./bots";
import { isAdminApiPath, isPublicFeedbackPath } from "./public-paths";
import { qrReference, safeHttpUrl } from "./service";

test("public paths: only /feedback/<token> and /feedback/<token>/opened", () => {
  for (const p of [
    "/feedback/8fK29LmXabcdefghijklmn", "/feedback/8fK29LmXabcdefghijklmn/", "/feedback/8fK29LmXabcdefghijklmn/opened", "/feedback/abc",
    // mangled links still reach the page, which answers with a friendly 404
    "/feedback/abc%2F..", "/feedback/x'%20OR%201=1", "/feedback/..",
  ]) {
    assert.equal(isPublicFeedbackPath(p), true, p);
  }
  for (const p of [
    "/feedback", "/feedback/", "/feedback/a/b/c", "/feedback/abc/other", "/feedback/../orders",
    "/artisan-appreciation", "/api/admin/artisan-feedback/qr/x/image", "/orders", "/", "/login",
    "/feedbackx/abc", "/print/qr/abc", "/feedback/" + "a".repeat(513),
  ]) {
    assert.equal(isPublicFeedbackPath(p), false, p);
  }
});

test("admin api paths", () => {
  assert.equal(isAdminApiPath("/api/admin/artisan-feedback/qr/x/image"), true);
  assert.equal(isAdminApiPath("/api/cloudinary/sign"), false);
});

test("bots: crawlers/previews excluded, real phones and in-app browsers counted", () => {
  for (const ua of [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "facebookexternalhit/1.1", "curl/8.4.0", "Slackbot-LinkExpanding 1.0", "python-requests/2.31", null, "",
  ]) assert.equal(isLikelyBot(ua), true, String(ua));
  for (const ua of [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36 WhatsApp/2.24",
  ]) assert.equal(isLikelyBot(ua), false, ua);
});

test("safeHttpUrl: http(s) only", () => {
  assert.equal(safeHttpUrl("https://x.com/a.jpg"), "https://x.com/a.jpg");
  for (const v of [null, undefined, "", "javascript:alert(1)", "data:text/html,x", "//x.com/a.jpg", "not a url", "file:///etc/passwd"]) {
    assert.equal(safeHttpUrl(v), null, String(v));
  }
});

test("qrReference: short, stable, does not expose the whole id", () => {
  const id = "cmabc123def456ghi789jkl01";
  assert.equal(qrReference(id), "QR-GHI789JKL01".slice(0, 3) + id.slice(-8).toUpperCase());
  assert.ok(qrReference(id).length < id.length);
});
