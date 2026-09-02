import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { authConfigured, aiConfigured } from "@/lib/env";
import { Card, CardBody, EmptyState, PageHeader } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import { SyncButton } from "./sync-button";

export const maxDuration = 60;
export const metadata = { title: "Inbox · Job Hunt Copilot" };

const CATEGORY_LABEL: Record<string, string> = {
  recruiter_outreach: "Recruiter outreach",
  application_ack: "Application received",
  interview_invite: "Interview invite",
  oa_invite: "OA invite",
  scheduling: "Scheduling",
  rejection: "Rejection",
  offer: "Offer",
  referral: "Referral",
  networking: "Networking",
  other: "Other",
};

export default async function InboxPage() {
  const threads = await prisma.emailThread.findMany({
    include: {
      application: { include: { company: true } },
      _count: { select: { messages: true } },
    },
    orderBy: [{ actionNeeded: "desc" }, { lastMessageAt: "desc" }],
  });

  return (
    <div>
      <PageHeader
        title="Inbox"
        description="Recruiter threads pulled from Gmail and triaged by the copilot"
        actions={authConfigured ? <SyncButton /> : null}
      />

      {!authConfigured && (
        <Card className="mb-4">
          <CardBody className="text-sm text-muted">
            Gmail sync needs Google OAuth. Set <code>AUTH_GOOGLE_ID</code> and{" "}
            <code>AUTH_GOOGLE_SECRET</code>, add the Gmail read scope in Google
            Cloud, then sign in with Google.
          </CardBody>
        </Card>
      )}
      {authConfigured && !aiConfigured && (
        <Card className="mb-4">
          <CardBody className="text-sm text-muted">
            Threads will sync, but summaries and auto-linking need{" "}
            <code>OPENAI_API_KEY</code>.
          </CardBody>
        </Card>
      )}

      {threads.length === 0 ? (
        <EmptyState
          title="No threads yet"
          description={
            authConfigured
              ? "Hit “Sync inbox” to pull recent job-search email."
              : "Connect Google to start syncing."
          }
        />
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <Link
              key={t.id}
              href={`/inbox/${t.id}`}
              className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {t.actionNeeded && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        action needed
                      </span>
                    )}
                    {t.category && (
                      <span className="text-xs text-muted">
                        {CATEGORY_LABEL[t.category] ?? t.category}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate font-medium">
                    {t.subject ?? "(no subject)"}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {t.summary ?? "Not summarized yet."}
                  </p>
                  {t.actionNote && (
                    <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                      → {t.actionNote}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right text-xs text-muted">
                  <p>{fmtDate(t.lastMessageAt)}</p>
                  <p>{t._count.messages} msg</p>
                  {t.application && (
                    <p className="mt-1 text-primary dark:text-indigo-300">
                      {t.application.company.name}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
