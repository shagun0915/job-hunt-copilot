import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import {
  ALL_STATUSES,
  PIPELINE_STATUSES,
  STATUS_META,
  statusLabel,
} from "@/lib/status";
import { fmtDate, fmtSalary, relativeDays } from "@/lib/utils";
import type { ApplicationStatus } from "@prisma/client";

export const metadata = { title: "Applications · Job Hunt Copilot" };

type SP = Promise<{ view?: string; status?: string; q?: string }>;

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const { view = "board", status, q } = await searchParams;

  const where = {
    ...(status && ALL_STATUSES.includes(status as ApplicationStatus)
      ? { status: status as ApplicationStatus }
      : {}),
    ...(q
      ? {
          OR: [
            { role: { contains: q, mode: "insensitive" as const } },
            { company: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [apps, total] = await Promise.all([
    prisma.application.findMany({
      where,
      include: {
        company: true,
        _count: {
          select: { deadlines: true, emailThreads: true, interviews: true },
        },
      },
      orderBy: [{ updatedAt: "desc" }],
    }),
    prisma.application.count(),
  ]);

  return (
    <div>
      <PageHeader
        title="Applications"
        description={`${total} tracked`}
        actions={
          <LinkButton href="/applications/new">Add application</LinkButton>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/applications?view=board"
          className={tab(view === "board")}
        >
          Board
        </Link>
        <Link href="/applications?view=list" className={tab(view === "list")}>
          List
        </Link>
        <span className="mx-1 h-4 w-px bg-border" />
        <Link href="/applications" className={chip(!status)}>
          All
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/applications?view=${view}&status=${s}`}
            className={chip(status === s)}
          >
            {statusLabel(s)}
          </Link>
        ))}
      </div>

      {apps.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Add your first role to start tracking the pipeline."
          action={<LinkButton href="/applications/new">Add application</LinkButton>}
        />
      ) : view === "list" ? (
        <ListView apps={apps} />
      ) : (
        <BoardView apps={apps} />
      )}
    </div>
  );
}

function tab(active: boolean) {
  return `rounded-lg px-2.5 py-1 ${
    active ? "bg-surface-2 font-medium" : "text-muted hover:text-foreground"
  }`;
}
function chip(active: boolean) {
  return `rounded-full border px-2.5 py-0.5 text-xs ${
    active
      ? "border-primary bg-primary text-primary-fg"
      : "border-border text-muted hover:text-foreground"
  }`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BoardView({ apps }: { apps: any[] }) {
  const columns: ApplicationStatus[] = [...PIPELINE_STATUSES, "REJECTED"];
  return (
    <div className="grid grid-flow-col auto-cols-[minmax(220px,1fr)] gap-3 overflow-x-auto pb-2">
      {columns.map((col) => {
        const items = apps.filter((a) => a.status === col);
        return (
          <div key={col} className="rounded-xl bg-surface-2/60 p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                {STATUS_META[col].label}
              </span>
              <span className="text-xs text-muted">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((a) => (
                <Link
                  key={a.id}
                  href={`/applications/${a.id}`}
                  className="block rounded-lg border border-border bg-surface p-3 shadow-sm transition-colors hover:border-primary/40"
                >
                  <p className="text-sm font-medium leading-snug">{a.role}</p>
                  <p className="text-xs text-muted">{a.company.name}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted">
                    {a.location && <span>{a.location}</span>}
                    {a._count.deadlines > 0 && (
                      <span className="text-amber-600 dark:text-amber-400">
                        ⏰ {a._count.deadlines}
                      </span>
                    )}
                    {a._count.emailThreads > 0 && (
                      <span>✉ {a._count.emailThreads}</span>
                    )}
                  </div>
                </Link>
              ))}
              {items.length === 0 && (
                <p className="px-1 py-3 text-xs text-muted">—</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ListView({ apps }: { apps: any[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">Role</th>
            <th className="px-3 py-2 font-medium">Company</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Applied</th>
            <th className="px-3 py-2 font-medium">Comp</th>
            <th className="px-3 py-2 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {apps.map((a) => (
            <tr key={a.id} className="hover:bg-surface-2/50">
              <td className="px-3 py-2">
                <Link
                  href={`/applications/${a.id}`}
                  className="font-medium hover:underline"
                >
                  {a.role}
                </Link>
              </td>
              <td className="px-3 py-2 text-muted">{a.company.name}</td>
              <td className="px-3 py-2">
                <StatusBadge status={a.status} />
              </td>
              <td className="px-3 py-2 text-muted">{fmtDate(a.appliedAt)}</td>
              <td className="px-3 py-2 text-muted">
                {fmtSalary(a.salaryMin, a.salaryMax, a.salaryNote)}
              </td>
              <td className="px-3 py-2 text-muted">{relativeDays(a.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
