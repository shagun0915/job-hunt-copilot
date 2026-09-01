"use client";

import { useActionState } from "react";
import {
  createApplication,
  type ActionState,
} from "@/lib/actions/applications";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { ALL_STATUSES, STATUS_META } from "@/lib/status";

export function ApplicationForm({ aiEnabled }: { aiEnabled: boolean }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createApplication,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.error && (
        <p className="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company *">
          <Input name="company" required placeholder="Acme Corp" />
        </Field>
        <Field label="Role *">
          <Input name="role" required placeholder="Software Engineer, Backend" />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue="APPLIED">
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Seniority">
          <Input name="seniority" placeholder="New grad / Mid / Senior" />
        </Field>
        <Field label="Location">
          <Input name="location" placeholder="Remote · US" />
        </Field>
        <Field label="Source">
          <Input name="source" placeholder="LinkedIn / referral / careers page" />
        </Field>
        <Field label="Job posting URL">
          <Input name="sourceUrl" type="url" placeholder="https://…" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Salary min ($)">
            <Input name="salaryMin" inputMode="numeric" placeholder="120000" />
          </Field>
          <Field label="Salary max ($)">
            <Input name="salaryMax" inputMode="numeric" placeholder="160000" />
          </Field>
        </div>
      </div>

      <Field label="Notes">
        <Textarea name="notes" placeholder="Referral from Sam, applied via portal…" />
      </Field>

      <Field
        label="Job description"
        hint={
          aiEnabled
            ? "Paste the full JD — the copilot will extract requirements, tech stack and red flags."
            : "Paste the full JD. Set OPENAI_API_KEY to auto-extract structured fields."
        }
      >
        <Textarea
          name="jdText"
          className="min-h-[160px] font-mono text-xs"
          placeholder="Paste the job description here…"
        />
      </Field>

      {aiEnabled && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="autoExtract"
            defaultChecked
            className="h-4 w-4 rounded border-border"
          />
          Run AI extraction on save
        </label>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save application"}
        </Button>
      </div>
    </form>
  );
}
