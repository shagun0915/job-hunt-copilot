import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { addDeadline, toggleDeadline, deleteDeadline } from "@/lib/actions/items";
import { fmtDateTime, relativeDays, daysBetween } from "@/lib/utils";
import { Trash2 } from "lucide-react";

export const metadata = { title: "Deadlines · Job Hunt Copilot" };

export default async function DeadlinesPage() {
  const now = new Date();
  const deadlines = await prisma.deadline.findMany({
    include: { application: { include: { company: true } } },
    orderBy: { dueAt: "asc" },
  });

  const open = deadlines.filter((d) => !d.completedAt);
  const done = deadlines.filter((d) => d.completedAt);
  const overdue = open.filter((d) => d.dueAt < now);
  const soon = open.filter(
    (d) => d.dueAt >= now && daysBetween(d.dueAt, now) <= 7,
  );
  const later = open.filter(
    (d) => d.dueAt >= now && daysBetween(d.dueAt, now) > 7,
  );

  return (
    <div>
      <PageHeader
        title="Deadlines"
        description="OA windows, take-homes, respond-by dates"
      />

      <Card className="mb-6">
        <CardBody>
          <form
            action={addDeadline}
            className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]"
          >
            <input
              name="title"
              required
              placeholder="e.g. Stripe HackerRank OA"
              className="h-9 rounded-lg border border-border bg-surface px-2.5 text-sm"
            />
            <select
              name="type"
              className="h-9 rounded-lg border border-border bg-surface px-2 text-sm"
            >
              {["OA", "TAKE_HOME", "APPLICATION", "RESPOND_BY", "INTERVIEW_PREP", "OTHER"].map(
                (t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ").toLowerCase()}
                  </option>
                ),
              )}
            </select>
            <input
              type="datetime-local"
              name="dueAt"
              required
              className="h-9 rounded-lg border border-border bg-surface px-2 text-sm"
            />
            <SubmitButton pendingText="Adding…">Add</SubmitButton>
          </form>
        </CardBody>
      </Card>

      <Group title="Overdue" items={overdue} tone="danger" />
      <Group title="Next 7 days" items={soon} tone="warn" />
      <Group title="Later" items={later} />
      {done.length > 0 && (
        <Group title="Completed" items={done} dim />
      )}

      {deadlines.length === 0 && (
        <p className="text-sm text-muted">No deadlines yet.</p>
      )}
    </div>
  );
}

function Group({
  title,
  items,
  tone,
  dim,
}: {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  tone?: "danger" | "warn";
  dim?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-5">
      <h2
        className={`mb-2 text-sm font-semibold ${
          tone === "danger"
            ? "text-rose-500"
            : tone === "warn"
              ? "text-amber-500"
              : ""
        }`}
      >
        {title}{" "}
        <span className="font-normal text-muted">({items.length})</span>
      </h2>
      <div className="space-y-2">
        {items.map((d) => (
          <div
            key={d.id}
            className={`flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3 text-sm ${
              dim ? "opacity-60" : ""
            }`}
          >
            <div>
              <p className={d.completedAt ? "font-medium line-through" : "font-medium"}>
                {d.application ? (
                  <Link
                    href={`/applications/${d.application.id}`}
                    className="hover:underline"
                  >
                    {d.title}
                  </Link>
                ) : (
                  d.title
                )}
              </p>
              <p className="text-xs text-muted">
                {d.application
                  ? `${d.application.company.name} · `
                  : ""}
                {d.type.replace("_", " ").toLowerCase()} · {fmtDateTime(d.dueAt)}{" "}
                ({relativeDays(d.dueAt)})
              </p>
            </div>
            <div className="flex items-center gap-1">
              <form action={toggleDeadline}>
                <input type="hidden" name="id" value={d.id} />
                <SubmitButton size="sm" variant="ghost" pendingText="…">
                  {d.completedAt ? "Reopen" : "Done"}
                </SubmitButton>
              </form>
              <form action={deleteDeadline}>
                <input type="hidden" name="id" value={d.id} />
                <button
                  type="submit"
                  className="rounded p-1 text-muted hover:text-rose-500"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
