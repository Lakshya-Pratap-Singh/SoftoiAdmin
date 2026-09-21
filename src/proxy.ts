import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { isAdminApiPath, isPublicFeedbackPath } from "@/lib/artisan-feedback/public-paths";

const { auth } = NextAuth(authConfig);

// Public customer pages (/feedback/<token>) are the only URLs reachable
// without logging in. Best-effort limiter per client IP — see the caveats in
// src/lib/rate-limit.ts. Tune with FEEDBACK_RATE_LIMIT_PER_MINUTE.
const feedbackLimiter = createRateLimiter({
  limit: Number(process.env.FEEDBACK_RATE_LIMIT_PER_MINUTE) || 30,
  windowMs: 60_000,
});

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (isPublicFeedbackPath(pathname)) {
    const ip = getClientIp(req.headers);
    if (ip) {
      const result = feedbackLimiter.check(ip);
      if (!result.allowed) {
        return new NextResponse("Too many requests. Please wait a minute and try again.", {
          status: 429,
          headers: { "Retry-After": String(result.retryAfterSeconds), "Cache-Control": "no-store" },
        });
      }
    }
    const response = NextResponse.next();
    // The token lives in the URL: keep it out of Referer headers, caches and search engines.
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const isLoggedIn = !!req.auth;
  const isLoginPage = pathname === "/login";

  if (!isLoggedIn && isAdminApiPath(pathname)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isLoggedIn && !isLoginPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  // Run on everything except static assets and the auth API routes
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
