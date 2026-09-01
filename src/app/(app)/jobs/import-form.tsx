"use client";

import { useActionState } from "react";
import { importBoard, type ImportResult } from "@/lib/actions/jobs";
import { Button, Card, CardBody } from "@/components/ui";

export function ImportForm() {
  const [state, action, pending] = useActionState<ImportResult, FormData>(
    importBoard,
    {},
  );

  return (
    <Card className="mb-6">
      <CardBody>
        <form
          action={action}
          className="grid gap-2 sm:grid-cols-[auto_1fr_auto]"
        >
          <select
            name="source"
            className="h-9 rounded-lg border border-border bg-surface px-2 text-sm"
          >
            <option value="greenhouse">Greenhouse</option>
            <option value="lever">Lever</option>
            <option value="ashby">Ashby</option>
          </select>
          <input
            name="token"
            required
            placeholder="board token or careers URL (e.g. stripe, or boards.greenhouse.io/stripe)"
            className="h-9 rounded-lg border border-border bg-surface px-2.5 text-sm"
          />
          <Button type="submit" disabled={pending}>
            {pending ? "Fetching…" : "Import board"}
          </Button>
        </form>
        {state.error ? (
          <p className="mt-2 text-xs text-rose-500">{state.error}</p>
        ) : state.added !== undefined ? (
          <p className="mt-2 text-xs text-muted">
            Added {state.added} new listing{state.added === 1 ? "" : "s"} (
            {state.total} on board).
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted">
            Pulls open roles straight from a company&apos;s ATS board — no login.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
