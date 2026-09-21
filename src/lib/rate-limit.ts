// Small fixed-window rate limiter, kept in memory.
//
// Honest limits of this approach: state lives inside one server process. On
// a single Node server it is a real limiter; on serverless hosting (e.g.
// Vercel) each warm instance keeps its own counters, so it is a best-effort
// speed-bump against scanners and accidental loops, not a hard guarantee. For
// hard limits add the host's firewall/WAF rules (see docs).

type Bucket = { count: number; resetAt: number };

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

export function createRateLimiter(options: {
  limit: number;
  windowMs: number;
  maxKeys?: number;
  now?: () => number;
}) {
  const { limit, windowMs, maxKeys = 10_000, now = Date.now } = options;
  const buckets = new Map<string, Bucket>();

  function prune(t: number) {
    for (const [key, bucket] of buckets) if (bucket.resetAt <= t) buckets.delete(key);
    // Still too many live keys (e.g. a flood from many IPs): drop the oldest
    // so memory stays bounded.
    while (buckets.size > maxKeys) {
      const oldest = buckets.keys().next().value;
      if (oldest === undefined) break;
      buckets.delete(oldest);
    }
  }

  return {
    check(key: string): RateLimitResult {
      const t = now();
      let bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= t) {
        if (buckets.size >= maxKeys) prune(t);
        bucket = { count: 0, resetAt: t + windowMs };
        buckets.set(key, bucket);
      }
      bucket.count += 1;
      const allowed = bucket.count <= limit;
      return {
        allowed,
        remaining: Math.max(limit - bucket.count, 0),
        retryAfterSeconds: Math.max(Math.ceil((bucket.resetAt - t) / 1000), 1),
      };
    },
    /** For tests. */
    size: () => buckets.size,
  };
}

/**
 * Client IP from proxy headers. Returns null when there isn't one, so callers
 * can skip limiting instead of lumping every unknown client into one bucket.
 * (X-Forwarded-For is only trustworthy behind a proxy you control — Vercel,
 * nginx, Cloudflare — which is how this app is deployed.)
 */
export function getClientIp(headers: { get(name: string): string | null }): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || null;
}
