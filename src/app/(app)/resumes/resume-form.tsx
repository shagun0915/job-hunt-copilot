"use client";

import { useActionState } from "react";
import { createResumeVersion } from "@/lib/actions/resumes";
import {
  Button,
  Card,
  CardBody,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";

export function ResumeForm() {
  const [state, formAction, pending] = useActionState(createResumeVersion, {});

  return (
    <Card>
      <CardBody>
        <form action={formAction} className="space-y-3">
          {state.error && (
            <p className="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              {state.error}
            </p>
          )}
          {state.ok && (
            <p className="rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Resume version saved.
            </p>
          )}
          <Field label="Label *">
            <Input name="label" required placeholder="Dynamics 365 / Generic SWE" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kind">
              <Select name="kind" defaultValue="OTHER">
                <option value="SPECIALIZED">Specialized</option>
                <option value="GENERIC">Generic</option>
                <option value="OTHER">Other</option>
              </Select>
            </Field>
            <Field label="Tuned for" hint="Used to auto-pick per JD.">
              <Input name="specialtyNote" placeholder="Dynamics 365 CE / Power Platform" />
            </Field>
          </div>
          <Field
            label="Upload file"
            hint="PDF, DOCX or TXT. Text is extracted and stored for matching."
          >
            <input
              type="file"
              name="file"
              accept=".pdf,.docx,.txt,.md"
              className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm"
            />
          </Field>
          <p className="text-center text-xs text-muted">or</p>
          <Field label="Paste resume text">
            <Textarea
              name="content"
              className="min-h-[140px] font-mono text-xs"
              placeholder="Paste plain-text resume…"
            />
          </Field>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Add resume version"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
