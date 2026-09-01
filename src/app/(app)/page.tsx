import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, EmptyState, LinkButton, PageHeader, Stat } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { fmtDate, fmtDateTime, relativeDays, daysBetween } from "@/lib/utils";
import { STATUS_META } from "@/lib/status";

export const metadata = { title: "Dashboard · Job Hunt Copilot" };

const FOLLOW_UP_DAYS = 7;

export default async function Dashboard() {
  const now = new Date();

  const [apps, upcomingDeadlines, recentEvents, upcomingInterviews] =
    await Promise.all([
      prisma.application.findMany({
        include: { company: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.deadline.findMany({
        where: { completedAt: null, dueAt: { gte: startOfDay(now) } },
        include: { application: { include: { company: true } } },
        orderBy: { dueAt: "asc" },
        take: 6,
      }),
      prisma.statusEvent.findMany({
        include: { application: { include: { company: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.interview.findMany({
        where: { scheduledAt: { gte: now } },
        include: { application: { include: { company: true } } },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      }),
    ]);

  const total = apps.length;
  const active = apps.filter((a) => STATUS_META[a.status].active).length;
  const applied = apps.filter((a) => a.status !== "SAVED");
  const gotResponse = applied.filter((a) =>
    ["OA", "PHONE_SCREEN", "ONSITE", "OFFER"].includes(a.status),
  ).length;
  const offers = apps.filter((a) => a.status === "OFFER").length;
  const responseRate = applied.length
    ? Math.round((gotResponse / applied.length) * 100)
    : 0;

  const overdue = upcomingDeadlines.length; // gte today only, so "upcoming"

  // Applications that are APPLIED and haven't moved in a while (no reply).
  const needFollowUp = apps
    .filter(
      (a) =>
        a.status === "APPLIED" &&
        daysBetween(now, a.updatedAt) >= FOLLOW_UP_DAYS,
    )
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
    .slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your job hunt at a glance"
        actions={<LinkButton href="/applications/new">Add application</LinkButton>}
      />

      {total === 0 ? (
        <EmptyState
          title="Nothing tracked yet"
          description="Add an application, or run the seed script for demo data."
          action={
            <LinkButton href="/applications/new">Add application</LinkButton>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Applications" value={total} sub={`${active} active`} />
            <Stat
              label="Response rate"
              value={`${responseRate}%`}
              sub={`${gotResponse}/${applied.length} advanced`}
            />
            <Stat label="Offers" value={offers} />
            <Stat
              label="Upcoming deadlines"
              value={overdue}
              sub={overdue ? "next 30 days" : "all clear"}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardBody>
                <h2 className="mb-3 text-sm font-semibold">Upcoming deadlines</h2>
                {upcomingDeadlines.length === 0 ? (
                  <p className="text-sm text-muted">Nothing due. Nice.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {upcomingDeadlines.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <div>
                          <p className="font-medium">
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
                            {d.application?.company.name ?? "General"} ·{" "}
                            {d.type.replace("_", " ").toLowerCase()}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 text-xs ${
                            daysBetween(d.dueAt, now) <= 2
                              ? "font-medium text-rose-500"
                              : "text-muted"
                          }`}
                        >
                          {fmtDate(d.dueAt)} · {relativeDays(d.dueAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/deadlines"
                  className="mt-3 inline-block text-xs text-muted hover:text-foreground"
                >
                  All deadlines →
                </Link>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h2 className="mb-3 text-sm font-semibold">
                  Needs follow-up{" "}
                  <span className="text-xs font-normal text-muted">
                    (silent {FOLLOW_UP_DAYS}+ days)
                  </span>
                </h2>
                {needFollowUp.length === 0 ? (
                  <p className="text-sm text-muted">No stale applications.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {needFollowUp.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <Link
                          href={`/applications/${a.id}`}
                          className="font-medium hover:underline"
                        >
                          {a.role}
                          <span className="font-normal text-muted">
                            {" "}
                            · {a.company.name}
                          </span>
                        </Link>
                        <span className="shrink-0 text-xs text-muted">
                          {relativeDays(a.updatedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h2 className="mb-3 text-sm font-semibold">Upcoming interviews</h2>
                {upcomingInterviews.length === 0 ? (
                  <p className="text-sm text-muted">None scheduled.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {upcomingInterviews.map((iv) => (
                      <li key={iv.id} className="flex justify-between gap-2">
                        <Link
                          href={`/applications/${iv.application.id}`}
                          className="font-medium hover:underline"
                        >
                          {iv.application.company.name}
                          <span className="font-normal text-muted">
                            {" "}
                            · {iv.type.replaceAll("_", " ").toLowerCase()}
                          </span>
                        </Link>
                        <span className="shrink-0 text-xs text-muted">
                          {fmtDateTime(iv.scheduledAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <h2 className="mb-3 text-sm font-semibold">Recent activity</h2>
                <ul className="space-y-2 text-sm">
                  {recentEvents.map((e) => (
                    <li key={e.id} className="flex justify-between gap-2">
                      <span>
                        <Link
                          href={`/applications/${e.application.id}`}
                          className="font-medium hover:underline"
                        >
                          {e.application.company.name}
                        </Link>{" "}
                        <span className="text-muted">
                          → {STATUS_META[e.to].label}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted">
                        {relativeDays(e.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Pipeline</h2>
              <Link
                href="/applications"
                className="text-xs text-muted hover:text-foreground"
              >
                View board →
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {apps.slice(0, 12).map((a) => (
                <Link
                  key={a.id}
                  href={`/applications/${a.id}`}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm hover:border-primary/40"
                >
                  {a.company.name}
                  <StatusBadge status={a.status} />
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}
