import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { aiConfigured } from "@/lib/env";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { AiActionButton } from "@/components/ai-action-button";
import { fmtDate, fmtDateTime, fmtSalary } from "@/lib/utils";
import { ALL_STATUSES, STATUS_META } from "@/lib/status";
import {
  deleteApplication,
  extractJDAction,
  setStatus,
} from "@/lib/actions/applications";
import {
  addContact,
  addDeadline,
  addInterview,
  deleteContact,
  deleteDeadline,
  deleteInterview,
  toggleDeadline,
  updateInterviewOutcome,
} from "@/lib/actions/items";
import { runResumeMatch } from "@/lib/actions/resumes";
import { EditDetails } from "./edit-details";
import { DraftPanel } from "./drafts";
import { AtsReview, type AtsReviewData } from "./ats-review";

// AI actions (extract, ATS pass) can run 20-40s on a slow model.
export const maxDuration = 60;

export default async function ApplicationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      company: true,
      contacts: { orderBy: { createdAt: "asc" } },
      deadlines: { orderBy: { dueAt: "asc" } },
      interviews: { orderBy: { createdAt: "desc" } },
      statusEvents: { orderBy: { createdAt: "desc" } },
      emailThreads: { orderBy: { lastMessageAt: "desc" } },
      matchScores: {
        include: { resumeVersion: { select: { label: true } } },
        orderBy: { createdAt: "desc" },
      },
      drafts: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!app) notFound();

  const resumes = await prisma.resumeVersion.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  const hasExtraction = Boolean(app.jdExtractedAt);

  return (
    <div>
      <div className="mb-4 text-sm text-muted">
        <Link href="/applications" className="hover:underline">
          Applications
        </Link>{" "}
        / {app.company.name}
      </div>

      <PageHeader
        title={app.role}
        description={[
          app.company.name,
          app.location,
          app.seniority,
          // skip the work-arrangement label if the location already implies it
          app.workArrangement &&
          !new RegExp(app.workArrangement, "i").test(app.location ?? "")
            ? { ONSITE: "On-site", REMOTE: "Remote", HYBRID: "Hybrid" }[
                app.workArrangement
              ]
            : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="flex gap-2">
            {app.sourceUrl && (
              <a
                href={app.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-2"
              >
                <ExternalLink className="h-4 w-4" /> Posting
              </a>
            )}
            {app.applicationUrl && (
              <a
                href={app.applicationUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-2"
              >
                <ExternalLink className="h-4 w-4" /> Application
              </a>
            )}
          </div>
        }
      />

      {/* status bar */}
      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-center gap-3">
          <StatusBadge status={app.status} />
          <form action={setStatus} className="flex items-center gap-2">
            <input type="hidden" name="id" value={app.id} />
            <select
              name="status"
              defaultValue={app.status}
              className="h-8 rounded-lg border border-border bg-surface px-2 text-sm"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
            <input
              name="note"
              placeholder="note (optional)"
              className="h-8 w-44 rounded-lg border border-border bg-surface px-2 text-sm"
            />
            <SubmitButton size="sm" variant="secondary" pendingText="…">
              Update
            </SubmitButton>
          </form>
          <div className="ml-auto text-xs text-muted">
            Applied {fmtDate(app.appliedAt)} · Comp{" "}
            {fmtSalary(app.salaryMin, app.salaryMax, app.salaryNote)}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* JD + extraction */}
          <Card>
            <CardBody>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Job description</h2>
                {aiConfigured && app.jdText ? (
                  <AiActionButton
                    action={extractJDAction}
                    hidden={{ id: app.id }}
                    pendingText="Analyzing…"
                  >
                    {hasExtraction ? "Re-run AI extract" : "AI extract"}
                  </AiActionButton>
                ) : null}
              </div>

              {hasExtraction ? (
                <div className="space-y-4 text-sm">
                  {app.jdSummary && (
                    <p className="text-muted">{app.jdSummary}</p>
                  )}
                  <Chips title="Must-have requirements" items={app.jdRequirements} />
                  <Chips title="Nice to have" items={app.jdNiceToHaves} muted />
                  <Chips title="Tech stack" items={app.jdTechStack} />
                  {app.jdRedFlags.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-rose-600 dark:text-rose-400">
                        Potential red flags
                      </p>
                      <ul className="list-disc space-y-1 pl-5 text-rose-700 dark:text-rose-300">
                        {app.jdRedFlags.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-muted">
                    Extracted {fmtDateTime(app.jdExtractedAt)} ·{" "}
                    {app.jdExtractModel}
                  </p>
                </div>
              ) : app.jdText ? (
                <p className="text-sm text-muted">
                  {aiConfigured
                    ? "Run AI extract to pull structured requirements, tech stack and red flags."
                    : "Set OPENAI_API_KEY to extract structured fields from this JD."}
                </p>
              ) : (
                <p className="text-sm text-muted">
                  No job description saved. Add one below to enable AI extraction
                  and resume matching.
                </p>
              )}

              {app.jdText && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs text-muted hover:text-foreground">
                    Show raw JD ({app.jdText.length.toLocaleString()} chars)
                  </summary>
                  <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-3 text-xs">
                    {app.jdText}
                  </pre>
                </details>
              )}
            </CardBody>
          </Card>

          {/* resume match */}
          <Card>
            <CardBody>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Resume match</h2>
              </div>

              {resumes.length === 0 ? (
                <p className="text-sm text-muted">
                  Add a resume version on the{" "}
                  <Link href="/resumes" className="underline">
                    Resumes
                  </Link>{" "}
                  page to score fit against this role.
                </p>
              ) : !aiConfigured ? (
                <p className="text-sm text-muted">
                  Set OPENAI_API_KEY to score resume fit.
                </p>
              ) : (
                <div className="mb-4">
                  <AiActionButton
                    action={runResumeMatch}
                    hidden={{ applicationId: app.id }}
                    pendingText="Running ATS pass…"
                    extra={
                      <select
                        name="resumeVersionId"
                        defaultValue="auto"
                        className="h-8 rounded-lg border border-border bg-surface px-2 text-sm"
                      >
                        <option value="auto">Auto-pick résumé</option>
                        {resumes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                            {r.isDefault ? " (default)" : ""}
                          </option>
                        ))}
                      </select>
                    }
                  >
                    Run ATS pass
                  </AiActionButton>
                </div>
              )}

              <div className="space-y-4">
                {app.matchScores.map((m) => (
                  <AtsReview
                    key={m.id}
                    applicationId={app.id}
                    submittedResumeVersionId={app.submittedResumeVersionId}
                    m={{
                      id: m.id,
                      resumeVersionId: m.resumeVersionId,
                      resumeLabel: m.resumeVersion.label,
                      createdAt: m.createdAt.toISOString(),
                      model: m.model,
                      scoreBefore: m.scoreBefore,
                      scoreAfter: m.scoreAfter,
                      scoreRationale: m.scoreRationale,
                      titleAlignment: m.titleAlignment,
                      autoPicked: m.autoPicked,
                      pickReason: m.pickReason,
                      matched: m.matched,
                      hardRequirementsGaps: m.hardRequirementsGaps,
                      niceToHaveGaps: m.niceToHaveGaps,
                      formattingFlags: m.formattingFlags,
                      uncloseableGaps: m.uncloseableGaps,
                      rewrites: Array.isArray(m.rewrites)
                        ? (m.rewrites as AtsReviewData["rewrites"])
                        : [],
                      verdict: m.verdict,
                    }}
                  />
                ))}
              </div>
            </CardBody>
          </Card>

          {/* drafts */}
          <Card>
            <CardBody>
              <DraftPanel
                applicationId={app.id}
                aiEnabled={aiConfigured}
                drafts={app.drafts.map((d) => ({
                  id: d.id,
                  kind: d.kind,
                  subject: d.subject,
                  shortNote: d.shortNote,
                  body: d.body,
                  model: d.model,
                  createdAt: d.createdAt.toISOString(),
                }))}
              />
            </CardBody>
          </Card>

          {/* interviews */}
          <Card>
            <CardBody>
              <h2 className="mb-3 text-sm font-semibold">Interviews</h2>
              <div className="space-y-2">
                {app.interviews.map((iv) => (
                  <div
                    key={iv.id}
                    className="rounded-lg border border-border p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {iv.type.replaceAll("_", " ").toLowerCase()}
                      </span>
                      <span className="text-xs text-muted">
                        {fmtDateTime(iv.scheduledAt)}
                      </span>
                    </div>
                    {iv.location && (
                      <p className="text-xs text-muted">{iv.location}</p>
                    )}
                    {iv.withNames.length > 0 && (
                      <p className="text-xs text-muted">
                        with {iv.withNames.join(", ")}
                      </p>
                    )}
                    {iv.prepNotes && (
                      <p className="mt-1 whitespace-pre-wrap text-muted">
                        {iv.prepNotes}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <form
                        action={updateInterviewOutcome}
                        className="flex flex-1 flex-wrap items-center gap-2"
                      >
                        <input type="hidden" name="id" value={iv.id} />
                        <input
                          type="hidden"
                          name="applicationId"
                          value={app.id}
                        />
                        <select
                          name="outcome"
                          defaultValue={iv.outcome ?? ""}
                          className="h-7 rounded border border-border bg-surface px-1.5 text-xs"
                        >
                          <option value="">outcome…</option>
                          <option value="pending">pending</option>
                          <option value="passed">passed</option>
                          <option value="failed">failed</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                        <input
                          name="debrief"
                          defaultValue={iv.debrief ?? ""}
                          placeholder="debrief"
                          className="h-7 flex-1 rounded border border-border bg-surface px-1.5 text-xs"
                        />
                        <SubmitButton size="sm" variant="ghost" pendingText="…">
                          Save
                        </SubmitButton>
                      </form>
                      <FormIconButton
                        action={deleteInterview}
                        hidden={{ id: iv.id, applicationId: app.id }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-muted hover:text-foreground">
                  + Add interview
                </summary>
                <form
                  action={addInterview}
                  className="mt-2 grid gap-2 sm:grid-cols-2"
                >
                  <input type="hidden" name="applicationId" value={app.id} />
                  <select
                    name="type"
                    className="h-8 rounded-lg border border-border bg-surface px-2 text-sm"
                  >
                    {[
                      "RECRUITER_SCREEN",
                      "TECHNICAL_PHONE",
                      "ONLINE_ASSESSMENT",
                      "TAKE_HOME",
                      "SYSTEM_DESIGN",
                      "BEHAVIORAL",
                      "ONSITE",
                      "FINAL",
                      "OTHER",
                    ].map((t) => (
                      <option key={t} value={t}>
                        {t.replaceAll("_", " ").toLowerCase()}
                      </option>
                    ))}
                  </select>
                  <input
                    type="datetime-local"
                    name="scheduledAt"
                    className="h-8 rounded-lg border border-border bg-surface px-2 text-sm"
                  />
                  <input
                    name="location"
                    placeholder="Zoom / onsite / HackerRank"
                    className="h-8 rounded-lg border border-border bg-surface px-2 text-sm"
                  />
                  <input
                    name="withNames"
                    placeholder="interviewers, comma separated"
                    className="h-8 rounded-lg border border-border bg-surface px-2 text-sm"
                  />
                  <textarea
                    name="prepNotes"
                    placeholder="prep notes"
                    className="sm:col-span-2 min-h-[60px] rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
                  />
                  <div className="sm:col-span-2">
                    <SubmitButton size="sm" pendingText="Adding…">
                      Add interview
                    </SubmitButton>
                  </div>
                </form>
              </details>
            </CardBody>
          </Card>

          {/* timeline */}
          <Card>
            <CardBody>
              <h2 className="mb-3 text-sm font-semibold">Timeline</h2>
              <ol className="space-y-2 text-sm">
                {app.statusEvents.map((e) => (
                  <li key={e.id} className="flex gap-3">
                    <span className="mt-0.5 text-xs text-muted">
                      {fmtDate(e.createdAt)}
                    </span>
                    <span>
                      {e.from ? (
                        <>
                          {STATUS_META[e.from].label} →{" "}
                          <strong>{STATUS_META[e.to].label}</strong>
                        </>
                      ) : (
                        <>
                          Created as <strong>{STATUS_META[e.to].label}</strong>
                        </>
                      )}
                      {e.note ? (
                        <span className="text-muted"> — {e.note}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>

        {/* sidebar */}
        <div className="space-y-6">
          <EditDetails
            app={JSON.parse(JSON.stringify(app))}
            resumes={resumes.map((r) => ({ id: r.id, label: r.label }))}
          />

          {/* contacts */}
          <Card>
            <CardBody>
              <h2 className="mb-3 text-sm font-semibold">Contacts</h2>
              <div className="space-y-2 text-sm">
                {app.contacts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-border p-2"
                  >
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted">
                        {c.role.toLowerCase().replace("_", " ")}
                        {c.email ? ` · ${c.email}` : ""}
                      </p>
                    </div>
                    <FormIconButton
                      action={deleteContact}
                      hidden={{ id: c.id, applicationId: app.id }}
                    />
                  </div>
                ))}
                {app.contacts.length === 0 && (
                  <p className="text-xs text-muted">None yet.</p>
                )}
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-muted hover:text-foreground">
                  + Add contact
                </summary>
                <form action={addContact} className="mt-2 space-y-2">
                  <input type="hidden" name="applicationId" value={app.id} />
                  <input
                    name="name"
                    required
                    placeholder="Name"
                    className="h-8 w-full rounded-lg border border-border bg-surface px-2 text-sm"
                  />
                  <select
                    name="role"
                    className="h-8 w-full rounded-lg border border-border bg-surface px-2 text-sm"
                  >
                    {[
                      "RECRUITER",
                      "HIRING_MANAGER",
                      "REFERRAL",
                      "INTERVIEWER",
                      "OTHER",
                    ].map((r) => (
                      <option key={r} value={r}>
                        {r.toLowerCase().replace("_", " ")}
                      </option>
                    ))}
                  </select>
                  <input
                    name="email"
                    placeholder="email"
                    className="h-8 w-full rounded-lg border border-border bg-surface px-2 text-sm"
                  />
                  <input
                    name="linkedinUrl"
                    placeholder="LinkedIn URL"
                    className="h-8 w-full rounded-lg border border-border bg-surface px-2 text-sm"
                  />
                  <SubmitButton size="sm" pendingText="Adding…">
                    Add
                  </SubmitButton>
                </form>
              </details>
            </CardBody>
          </Card>

          {/* deadlines */}
          <Card>
            <CardBody>
              <h2 className="mb-3 text-sm font-semibold">Deadlines</h2>
              <div className="space-y-2 text-sm">
                {app.deadlines.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-border p-2"
                  >
                    <div>
                      <p
                        className={
                          d.completedAt
                            ? "font-medium line-through text-muted"
                            : "font-medium"
                        }
                      >
                        {d.title}
                      </p>
                      <p className="text-xs text-muted">
                        {d.type.replace("_", " ").toLowerCase()} ·{" "}
                        {fmtDateTime(d.dueAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <form action={toggleDeadline}>
                        <input type="hidden" name="id" value={d.id} />
                        <SubmitButton size="sm" variant="ghost" pendingText="…">
                          {d.completedAt ? "Undo" : "Done"}
                        </SubmitButton>
                      </form>
                      <FormIconButton
                        action={deleteDeadline}
                        hidden={{ id: d.id }}
                      />
                    </div>
                  </div>
                ))}
                {app.deadlines.length === 0 && (
                  <p className="text-xs text-muted">None yet.</p>
                )}
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-muted hover:text-foreground">
                  + Add deadline
                </summary>
                <form action={addDeadline} className="mt-2 space-y-2">
                  <input type="hidden" name="applicationId" value={app.id} />
                  <input
                    name="title"
                    required
                    placeholder="e.g. HackerRank OA"
                    className="h-8 w-full rounded-lg border border-border bg-surface px-2 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      name="type"
                      className="h-8 rounded-lg border border-border bg-surface px-2 text-sm"
                    >
                      {[
                        "OA",
                        "TAKE_HOME",
                        "APPLICATION",
                        "RESPOND_BY",
                        "INTERVIEW_PREP",
                        "OTHER",
                      ].map((t) => (
                        <option key={t} value={t}>
                          {t.replace("_", " ").toLowerCase()}
                        </option>
                      ))}
                    </select>
                    <input
                      type="datetime-local"
                      name="dueAt"
                      required
                      className="h-8 rounded-lg border border-border bg-surface px-2 text-sm"
                    />
                  </div>
                  <SubmitButton size="sm" pendingText="Adding…">
                    Add
                  </SubmitButton>
                </form>
              </details>
            </CardBody>
          </Card>

          {/* emails */}
          <Card>
            <CardBody>
              <h2 className="mb-3 text-sm font-semibold">Linked emails</h2>
              {app.emailThreads.length === 0 ? (
                <p className="text-xs text-muted">
                  No threads linked.{" "}
                  <Link href="/inbox" className="underline">
                    Sync inbox
                  </Link>
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {app.emailThreads.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/inbox/${t.id}`}
                        className="font-medium hover:underline"
                      >
                        {t.subject ?? "(no subject)"}
                      </Link>
                      {t.summary && (
                        <p className="text-xs text-muted">{t.summary}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <form action={deleteApplication}>
            <input type="hidden" name="id" value={app.id} />
            <SubmitButton
              variant="danger"
              size="sm"
              pendingText="Deleting…"
              className="w-full"
            >
              <Trash2 className="h-4 w-4" /> Delete application
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}

function Chips({
  title,
  items,
  muted,
}: {
  title: string;
  items: string[];
  muted?: boolean;
}) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <span
            key={i}
            className={`rounded-md px-2 py-0.5 text-xs ${
              muted
                ? "bg-surface-2 text-muted"
                : "bg-primary/10 text-primary dark:text-indigo-300"
            }`}
          >
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

// Small delete button rendered as its own form (can't nest forms).
function FormIconButton({
  action,
  hidden,
}: {
  action: (fd: FormData) => Promise<void>;
  hidden: Record<string, string>;
}) {
  return (
    <form action={action}>
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        className="rounded p-1 text-muted hover:bg-surface-2 hover:text-rose-500"
        aria-label="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}
