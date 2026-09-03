import { NextResponse, type NextRequest } from "next/server";

/**
 * Security headers for every HTML response.
 *
 * The CSP is nonce-based: a fresh nonce per request, `strict-dynamic` so the
 * Next.js/React runtime scripts it trusts can load their own chunks, and no
 * `'unsafe-inline'` for scripts. Next reads the nonce back out of the CSP header
 * during SSR and stamps it onto every script tag it emits, so this only works
 * because every route here is dynamically rendered (see `export const dynamic`
 * in the root and `(app)` layouts).
 *
 * `style-src` keeps `'unsafe-inline'` — Tailwind ships a static stylesheet but
 * `next/font` injects a small inline `<style>`, and style injection is not an
 * XSS vector worth forcing all styles through a nonce for.
 */
export function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    // The Google sign-in form action redirects to accounts.google.com.
    `form-action 'self' https://accounts.google.com`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("content-security-policy", csp);
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  );
  if (!isDev) {
    response.headers.set(
      "strict-transport-security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return response;
}

export const config = {
  // Everything except API routes (they set their own headers / need no CSP),
  // Next's static assets, and image optimization. Also skip link prefetches.
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
