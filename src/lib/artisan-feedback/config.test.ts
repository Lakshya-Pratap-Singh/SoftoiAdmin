import { test } from "node:test";
import assert from "node:assert/strict";
import { buildFeedbackUrl, getAppBaseUrl } from "./config";

test("config: uses APP_BASE_URL, normalised to an origin", () => {
  assert.equal(getAppBaseUrl({ APP_BASE_URL: "https://inventory.softoi.shop" }), "https://inventory.softoi.shop");
  assert.equal(getAppBaseUrl({ APP_BASE_URL: "https://inventory.softoi.shop/" }), "https://inventory.softoi.shop");
  assert.equal(getAppBaseUrl({ APP_BASE_URL: " https://inventory.softoi.shop/some/path?x=1 " }), "https://inventory.softoi.shop");
});

test("config: production refuses to run without APP_BASE_URL (no QR pointing at localhost)", () => {
  assert.throws(() => getAppBaseUrl({ NODE_ENV: "production" }), /APP_BASE_URL is not set/);
  assert.throws(() => getAppBaseUrl({ NODE_ENV: "production", APP_BASE_URL: "   " }), /APP_BASE_URL is not set/);
});

test("config: development falls back to localhost", () => {
  assert.equal(getAppBaseUrl({ NODE_ENV: "development" }), "http://localhost:3000");
  assert.equal(getAppBaseUrl({}), "http://localhost:3000");
});

test("config: rejects malformed / non-http / insecure-in-production values", () => {
  assert.throws(() => getAppBaseUrl({ APP_BASE_URL: "not a url" }), /not a valid URL/);
  assert.throws(() => getAppBaseUrl({ APP_BASE_URL: "javascript:alert(1)" }), /must start with https/);
  assert.throws(() => getAppBaseUrl({ APP_BASE_URL: "ftp://x.com" }), /must start with https/);
  assert.throws(() => getAppBaseUrl({ NODE_ENV: "production", APP_BASE_URL: "http://inventory.softoi.shop" }), /https/);
  assert.equal(getAppBaseUrl({ NODE_ENV: "development", APP_BASE_URL: "http://localhost:3000" }), "http://localhost:3000");
});

test("feedback URL: base + /feedback/<token>, nothing else", () => {
  assert.equal(buildFeedbackUrl("8fK29LmXabcdefghijklmn", "https://inventory.softoi.shop"), "https://inventory.softoi.shop/feedback/8fK29LmXabcdefghijklmn");
});
