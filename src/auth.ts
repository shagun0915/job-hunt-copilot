import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfigured, env } from "@/lib/env";

/**
 * NextAuth v5 config.
 *
 * When Google OAuth env vars are missing (`authConfigured === false`) the app
 * runs ungated in local single-user mode — see `getViewer()` below and
 * `middleware.ts`. When configured, only `ALLOWED_EMAIL` may sign in, and the
 * Google grant also carries the Gmail read scope for inbox sync.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: authConfigured
    ? [
        Google({
          clientId: env.googleId,
          clientSecret: env.googleSecret,
          authorization: {
            params: {
              access_type: "offline",
              prompt: "consent",
              scope: [
                "openid",
                "email",
                "profile",
                env.gmailScope,
              ].join(" "),
            },
          },
        }),
      ]
    : [],
  callbacks: {
    async signIn({ user }) {
      if (!env.allowedEmail) return true;
      return (user.email ?? "").toLowerCase() === env.allowedEmail;
    },
  },
  pages: { signIn: "/signin" },
});
