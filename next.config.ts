import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The project dir name contains a space and sits beside other folders;
  // pin the workspace root so Turbopack doesn't guess the parent.
  turbopack: { root: __dirname },
  // Don't advertise the framework. Security headers/CSP live in src/proxy.ts.
  poweredByHeader: false,
};

export default nextConfig;
