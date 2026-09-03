import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Nonce-based CSP (see src/proxy.ts) needs every route rendered per-request so
// Next can stamp the request's nonce onto its script tags.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Job Hunt Copilot",
  description:
    "Track every application, recruiter email, OA deadline, interview and resume version — with an LLM assist.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
