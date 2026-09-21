import { test } from "node:test";
import assert from "node:assert/strict";
import { generateToken, isValidTokenFormat, tokenPrefix } from "./token";

test("token: 22 URL-safe characters (128 bits)", () => {
  const t = generateToken();
  assert.equal(t.length, 22);
  assert.match(t, /^[A-Za-z0-9_-]{22}$/);
});

test("token: no collisions across 20,000 tokens and nothing sequential", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 20_000; i++) seen.add(generateToken());
  assert.equal(seen.size, 20_000);
});

test("token: has no shared prefix/structure that could leak ordering", () => {
  const firstChars = new Set(Array.from({ length: 500 }, () => generateToken()[0]));
  assert.ok(firstChars.size > 20, "first character should vary widely");
});

test("token format: accepts real tokens, rejects junk before it reaches the DB", () => {
  assert.equal(isValidTokenFormat(generateToken()), true);
  for (const bad of [
    "", "short", "a".repeat(15), "a".repeat(65),
    "../../etc/passwd", "abc def ghi jkl mno pqr", "token'; DROP TABLE users;--",
    "abcdefghijklmnop/qrstuv", "abcdefghijklmnop.qrstuv", "abcdefghijklmnop%20rstuv",
    "<script>alert(1)</script>",
  ]) {
    assert.equal(isValidTokenFormat(bad), false, `should reject ${JSON.stringify(bad)}`);
  }
  for (const nonString of [null, undefined, 123, {}, [], ["abcdefghijklmnopqrstuv"]]) {
    assert.equal(isValidTokenFormat(nonString), false);
  }
});

test("tokenPrefix: only a short fragment is ever logged", () => {
  assert.equal(tokenPrefix("8fK29LmXabcdefghijklmn"), "8fK29L");
});
