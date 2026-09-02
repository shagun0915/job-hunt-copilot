import { redirect } from "next/navigation";
import { Nav, MobileNav } from "@/components/nav";
import { getViewer } from "@/lib/viewer";
import { aiConfigured, authConfigured } from "@/lib/env";

// Every authenticated page reads the database at request time.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl gap-6 px-4 py-6">
      <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-52 shrink-0 flex-col md:flex">
        <Nav viewerName={viewer.name} canSignOut={authConfigured} />
      </aside>
      <main className="min-w-0 flex-1">
        <MobileNav />
        {(!authConfigured || !aiConfigured) && (
          <div className="mb-4 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300">
            {!authConfigured && (
              <span>
                Running in local mode — set <code>AUTH_GOOGLE_ID</code> /{" "}
                <code>AUTH_GOOGLE_SECRET</code> to enable sign-in and Gmail sync.
              </span>
            )}
            {!authConfigured && !aiConfigured && <span> · </span>}
            {!aiConfigured && (
              <span>
                Set <code>OPENAI_API_KEY</code> to enable AI extraction, matching
                and email summaries.
              </span>
            )}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
