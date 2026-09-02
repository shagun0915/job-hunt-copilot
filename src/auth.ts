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
    async signIn({ user, account }) {
      if (env.allowedEmail) {
        const ok = (user.email ?? "").toLowerCase() === env.allowedEmail;
        if (!ok) return false;
      }

      // The Prisma adapter only writes Google tokens when the Account row is
      // first linked — it never refreshes them on subsequent logins. Persist
      // the fresh tokens here so Gmail sync doesn't keep using a stale one.
      if (account?.provider === "google" && account.providerAccountId) {
        await prisma.account.updateMany({
          where: {
            provider: "google",
            providerAccountId: account.providerAccountId,
          },
          data: {
            access_token: account.access_token,
            expires_at: account.expires_at,
            scope: account.scope,
            token_type: account.token_type,
            id_token: account.id_token,
            ...(account.refresh_token
              ? { refresh_token: account.refresh_token }
              : {}),
          },
        });
      }
      return true;
    },
  },
  pages: { signIn: "/signin" },
});
