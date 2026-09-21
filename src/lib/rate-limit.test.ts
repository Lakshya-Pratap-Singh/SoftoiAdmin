import { test } from "node:test";
import assert from "node:assert/strict";
import { createRateLimiter, getClientIp } from "./rate-limit";

test("rate limit: allows up to the limit, blocks after, resets when the window ends", () => {
  let t = 1_000;
  const rl = createRateLimiter({ limit: 3, windowMs: 60_000, now: () => t });
  assert.deepEqual([1, 2, 3].map(() => rl.check("ip").allowed), [true, true, true]);
  const blocked = rl.check("ip");
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 60);
  t += 30_000;
  assert.equal(rl.check("ip").allowed, false);
  assert.equal(rl.check("ip").retryAfterSeconds, 30);
  t += 30_001;
  assert.equal(rl.check("ip").allowed, true, "new window");
});

test("rate limit: keys are independent", () => {
  const rl = createRateLimiter({ limit: 1, windowMs: 60_000 });
  assert.equal(rl.check("a").allowed, true);
  assert.equal(rl.check("a").allowed, false);
  assert.equal(rl.check("b").allowed, true);
});

test("rate limit: memory stays bounded under a flood of distinct keys", () => {
  const rl = createRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 100 });
  for (let i = 0; i < 5_000; i++) rl.check(`ip-${i}`);
  assert.ok(rl.size() <= 101, `size was ${rl.size()}`);
});

test("client ip: first X-Forwarded-For hop, then X-Real-IP, else null (so callers skip limiting)", () => {
  const h = (o: Record<string, string>) => ({ get: (k: string) => o[k.toLowerCase()] ?? null });
  assert.equal(getClientIp(h({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })), "1.2.3.4");
  assert.equal(getClientIp(h({ "x-real-ip": "5.6.7.8" })), "5.6.7.8");
  assert.equal(getClientIp(h({})), null);
});
