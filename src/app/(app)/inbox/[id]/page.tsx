import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { linkThreadToApplication } from "@/lib/actions/inbox";
import { fmtDateTime } from "@/lib/utils";

export default async function ThreadDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const thread = await prisma.emailThread.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { sentAt: "asc" } },
      application: { include: { company: true } },
    },
  });
  if (!thread) notFound();

  const apps = await prisma.application.findMany({
    include: { company: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="mb-4 text-sm text-muted">
        <Link href="/inbox" className="hover:underline">
          Inbox
        </Link>{" "}
        / thread
      </div>
      <PageHeader title={thread.subject ?? "(no subject)"} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {thread.messages.map((m) => (
            <Card key={m.id}>
              <CardBody>
                <div className="mb-2 flex items-center justify-between text-xs text-muted">
                  <span>
                    <strong className="text-foreground">
                      {m.fromName || m.fromEmail}
                    </strong>{" "}
                    {m.fromName && m.fromEmail ? `<${m.fromEmail}>` : ""}
                  </span>
                  <span>{fmtDateTime(m.sentAt)}</span>
                </div>
                <pre className="whitespace-pre-wrap break-words font-sans text-sm">
                  {m.bodyText || m.snippet}
                </pre>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card>
            <CardBody>
              <h2 className="mb-2 text-sm font-semibold">Copilot summary</h2>
              {thread.summary ? (
                <>
                  <p className="text-sm text-muted">{thread.summary}</p>
                  {thread.category && (
                    <p className="mt-2 text-xs text-muted">
                      Category: {thread.category.replace("_", " ")}
                    </p>
                  )}
                  {thread.actionNeeded && thread.actionNote && (
                    <p className="mt-2 rounded-lg bg-amber-100 px-2 py-1.5 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      → {thread.actionNote}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted">
                  Not summarized. Run a sync with OPENAI_API_KEY set.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h2 className="mb-2 text-sm font-semibold">Linked application</h2>
              <form action={linkThreadToApplication} className="space-y-2">
                <input type="hidden" name="threadId" value={thread.id} />
                <select
                  name="applicationId"
                  defaultValue={thread.applicationId ?? ""}
                  className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm"
                >
                  <option value="">— none —</option>
                  {apps.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.company.name} · {a.role}
                    </option>
                  ))}
                </select>
                <SubmitButton size="sm" pendingText="Saving…">
                  Save link
                </SubmitButton>
              </form>
              {thread.application && (
                <Link
                  href={`/applications/${thread.application.id}`}
                  className="mt-2 inline-block text-xs text-primary hover:underline dark:text-indigo-300"
                >
                  Open {thread.application.company.name} →
                </Link>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
