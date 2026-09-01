import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EmptyState, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { fmtDate } from "@/lib/utils";
import { dismissListing, restoreListing, trackListing } from "@/lib/actions/jobs";
import { ImportForm } from "./import-form";

export const metadata = { title: "Job board · Job Hunt Copilot" };

type SP = Promise<{ show?: string; q?: string }>;

export default async function JobsPage({ searchParams }: { searchParams: SP }) {
  const { show, q } = await searchParams;
  const showDismissed = show === "dismissed";

  const listings = await prisma.jobListing.findMany({
    where: {
      dismissed: showDismissed,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { company: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ postedAt: "desc" }, { fetchedAt: "desc" }],
    take: 100,
  });

  const activeCount = await prisma.jobListing.count({
    where: { dismissed: false },
  });

  return (
    <div>
      <PageHeader
        title="Job board"
        description="Aggregated openings from company ATS boards"
      />

      <ImportForm />

      <div className="mb-4 flex items-center gap-2 text-sm">
        <Link
          href="/jobs"
          className={`rounded-lg px-2.5 py-1 ${
            !showDismissed ? "bg-surface-2 font-medium" : "text-muted"
          }`}
        >
          Open ({activeCount})
        </Link>
        <Link
          href="/jobs?show=dismissed"
          className={`rounded-lg px-2.5 py-1 ${
            showDismissed ? "bg-surface-2 font-medium" : "text-muted"
          }`}
        >
          Dismissed
        </Link>
      </div>

      {listings.length === 0 ? (
        <EmptyState
          title={showDismissed ? "Nothing dismissed" : "No listings yet"}
          description={
            showDismissed
              ? undefined
              : "Import a company board above to populate this feed."
          }
        />
      ) : (
        <div className="space-y-2">
          {listings.map((l) => (
            <div
              key={l.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium hover:underline"
                  >
                    {l.title}
                  </a>
                  <p className="text-sm text-muted">
                    {l.company}
                    {l.location ? ` · ${l.location}` : ""}
                    {l.remote ? " · remote" : ""}
                    {l.salaryText ? ` · ${l.salaryText}` : ""}
                  </p>
                  {l.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted">
                      {l.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted">
                    {l.source} · posted {fmtDate(l.postedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  {l.savedAppId ? (
                    <Link
                      href={`/applications/${l.savedAppId}`}
                      className="rounded-lg border border-border px-2.5 py-1 text-center text-xs hover:bg-surface-2"
                    >
                      Tracked →
                    </Link>
                  ) : (
                    <form action={trackListing}>
                      <input type="hidden" name="id" value={l.id} />
                      <SubmitButton size="sm" pendingText="…">
                        Track
                      </SubmitButton>
                    </form>
                  )}
                  {showDismissed ? (
                    <form action={restoreListing}>
                      <input type="hidden" name="id" value={l.id} />
                      <SubmitButton size="sm" variant="ghost" pendingText="…">
                        Restore
                      </SubmitButton>
                    </form>
                  ) : (
                    <form action={dismissListing}>
                      <input type="hidden" name="id" value={l.id} />
                      <SubmitButton size="sm" variant="ghost" pendingText="…">
                        Dismiss
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
