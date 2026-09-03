import { auth } from "@/auth";
import { authConfigured, enforceAuth } from "@/lib/env";

export type Viewer = {
  name: string;
  email: string | null;
  image: string | null;
  local: boolean;
};

/**
 * Resolve the current viewer. In local mode (no Google OAuth configured) this
 * is always a synthetic single user so the app is fully usable offline.
 */
export async function getViewer(): Promise<Viewer | null> {
  if (!authConfigured) {
    // On a deployed host an unauthenticated request stays unauthenticated - we
    // never fall back to the synthetic user. (env.ts also throws at boot when
    // this happens, so this is defense in depth.)
    if (enforceAuth) return null;
    return { name: "You", email: null, image: null, local: true };
  }
  const session = await auth();
  if (!session?.user) return null;
  return {
    name: session.user.name ?? "You",
    email: session.user.email ?? null,
    image: session.user.image ?? null,
    local: false,
  };
}

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw new Error("Not authenticated");
  return viewer;
}
