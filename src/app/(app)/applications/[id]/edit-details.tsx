"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";
import { Card, CardBody } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import {
  updateApplication,
  type ActionState,
} from "@/lib/actions/applications";
import { fmtDate } from "@/lib/utils";

type App = {
  id: string;
  role: string;
  seniority: string | null;
  location: string | null;
  workArrangement: "ONSITE" | "REMOTE" | "HYBRID" | null;
  source: string | null;
  sourceUrl: string | null;
  applicationUrl: string | null;
  appliedAt: string | null;
  submittedResumeVersionId: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNote: string | null;
  notes: string | null;
  jdText: string | null;
};

type ResumeOption = { id: string; label: string };

const input =
  "h-8 w-full rounded-lg border border-border bg-surface px-2 text-sm";

const ARRANGEMENT_LABEL: Record<NonNullable<App["workArrangement"]>, string> = {
  ONSITE: "On-site",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
};

/** ISO string → "YYYY-MM-DD" for a <input type="date"> default value. */
function dateInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function EditDetails({
  app,
  resumes,
}: {
  app: App;
  resumes: ResumeOption[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateApplication,
    {},
  );
  const submittedResume = resumes.find(
    (r) => r.id === app.submittedResumeVersionId,
  );

  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Details</h2>
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1 text-xs font-medium hover:bg-surface-2"
          >
            {open ? (
              "Close"
            ) : (
              <>
                <Pencil className="h-3 w-3" /> Edit
              </>
            )}
          </button>
        </div>

        {!open ? (
          <dl className="space-y-1.5 text-sm">
            <Row k="Applied on" v={app.appliedAt ? fmtDate(app.appliedAt) : null} />
            <Row k="Seniority" v={app.seniority} />
            <Row k="Location" v={app.location} />
            <Row
              k="Work"
              v={app.workArrangement ? ARRANGEMENT_LABEL[app.workArrangement] : null}
            />
            <Row k="Source" v={app.source} />
            <Row k="Résumé sent" v={submittedResume?.label ?? null} />
            <LinkRow k="Job posting" href={app.sourceUrl} />
            <LinkRow k="Application" href={app.applicationUrl} />
            <Row
              k="Salary"
              v={
                app.salaryMin || app.salaryMax
                  ? `${app.salaryMin ?? "?"} – ${app.salaryMax ?? "?"}`
                  : app.salaryNote
              }
            />
            {app.notes ? (
              <p className="pt-2 whitespace-pre-wrap text-muted">{app.notes}</p>
            ) : null}
          </dl>
        ) : (
          <form action={formAction} className="space-y-2">
            <input type="hidden" name="id" value={app.id} />
            {state.error && (
              <p className="text-xs text-rose-500">{state.error}</p>
            )}
            {state.ok && <p className="text-xs text-emerald-500">Saved.</p>}

            <input
              name="role"
              defaultValue={app.role}
              placeholder="Role"
              className={input}
            />

            <label className="block text-xs text-muted">
              Applied on
              <input
                type="date"
                name="appliedAt"
                defaultValue={dateInputValue(app.appliedAt)}
                className={`${input} mt-0.5`}
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <input
                name="seniority"
                defaultValue={app.seniority ?? ""}
                placeholder="Seniority"
                className={input}
              />
              <select
                name="workArrangement"
                defaultValue={app.workArrangement ?? ""}
                className={input}
              >
                <option value="">Work — unset</option>
                <option value="ONSITE">On-site</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>

            <input
              name="location"
              defaultValue={app.location ?? ""}
              placeholder="Location"
              className={input}
            />
            <input
              name="source"
              defaultValue={app.source ?? ""}
              placeholder="Source (LinkedIn, referral, careers page…)"
              className={input}
            />
            <input
              name="sourceUrl"
              defaultValue={app.sourceUrl ?? ""}
              placeholder="Job posting URL"
              className={input}
            />
            <input
              name="applicationUrl"
              defaultValue={app.applicationUrl ?? ""}
              placeholder="Application URL (where you submitted)"
              className={input}
            />
            {resumes.length > 0 && (
              <select
                name="submittedResumeVersionId"
                defaultValue={app.submittedResumeVersionId ?? ""}
                className={input}
              >
                <option value="">Résumé sent — not set</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    Résumé sent: {r.label}
                  </option>
                ))}
              </select>
            )}

            <div className="grid grid-cols-2 gap-2">
              <input
                name="salaryMin"
                defaultValue={app.salaryMin ?? ""}
                placeholder="Salary min"
                inputMode="numeric"
                className={input}
              />
              <input
                name="salaryMax"
                defaultValue={app.salaryMax ?? ""}
                placeholder="Salary max"
                inputMode="numeric"
                className={input}
              />
            </div>
            <textarea
              name="notes"
              defaultValue={app.notes ?? ""}
              placeholder="Notes"
              className="min-h-[70px] w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
            />
            <details>
              <summary className="cursor-pointer text-xs text-muted">
                Edit job description text
              </summary>
              <textarea
                name="jdText"
                defaultValue={app.jdText ?? ""}
                className="mt-2 min-h-[140px] w-full rounded-lg border border-border bg-surface px-2 py-1.5 font-mono text-xs"
              />
            </details>
            <SubmitButton size="sm" pendingText="Saving…">
              Save
            </SubmitButton>
          </form>
        )}
      </CardBody>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right">{v || "—"}</dd>
    </div>
  );
}

function LinkRow({ k, href }: { k: string; href: string | null }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted">{k}</dt>
      <dd className="max-w-[60%] truncate text-right">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline dark:text-indigo-300"
          >
            open ↗
          </a>
        ) : (
          "—"
        )}
      </dd>
    </div>
  );
}
