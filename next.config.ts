import type { NextConfig } from "next";

// Sent on every response. Conservative set for a single-user app: deny framing
// (clickjacking), stop MIME sniffing, trim the referrer, and drop browser
// features the app never uses. HSTS is added by Vercel for its domains.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  // The project dir name contains a space and sits beside other folders;
  // pin the workspace root so Turbopack doesn't guess the parent.
  turbopack: { root: __dirname },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
