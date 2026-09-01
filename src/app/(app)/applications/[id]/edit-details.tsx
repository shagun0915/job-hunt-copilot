"use client";

import { useActionState, useState } from "react";
import { Card, CardBody } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import {
  updateApplication,
  type ActionState,
} from "@/lib/actions/applications";

type App = {
  id: string;
  role: string;
  seniority: string | null;
  location: string | null;
  source: string | null;
  sourceUrl: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNote: string | null;
  notes: string | null;
  jdText: string | null;
};

const input =
  "h-8 w-full rounded-lg border border-border bg-surface px-2 text-sm";

export function EditDetails({ app }: { app: App }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateApplication,
    {},
  );

  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Details</h2>
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-xs text-muted hover:text-foreground"
          >
            {open ? "Close" : "Edit"}
          </button>
        </div>

        {!open ? (
          <dl className="space-y-1.5 text-sm">
            <Row k="Seniority" v={app.seniority} />
            <Row k="Location" v={app.location} />
            <Row k="Source" v={app.source} />
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
            {state.ok && (
              <p className="text-xs text-emerald-500">Saved.</p>
            )}
            <input
              name="role"
              defaultValue={app.role}
              placeholder="Role"
              className={input}
            />
            <input
              name="seniority"
              defaultValue={app.seniority ?? ""}
              placeholder="Seniority"
              className={input}
            />
            <input
              name="location"
              defaultValue={app.location ?? ""}
              placeholder="Location"
              className={input}
            />
            <input
              name="source"
              defaultValue={app.source ?? ""}
              placeholder="Source"
              className={input}
            />
            <input
              name="sourceUrl"
              defaultValue={app.sourceUrl ?? ""}
              placeholder="Posting URL"
              className={input}
            />
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
