"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { syncInbox, type SyncResult } from "@/lib/actions/inbox";
import { Button } from "@/components/ui";

export function SyncButton() {
  const [state, action, pending] = useActionState<SyncResult, FormData>(
    async () => syncInbox(),
    {},
  );

  return (
    <form action={action} className="flex items-center gap-3">
      <Button type="submit" disabled={pending}>
        <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Syncing…" : "Sync inbox"}
      </Button>
      {state.error ? (
        <span className="text-xs text-rose-500">{state.error}</span>
      ) : state.scanned !== undefined ? (
        <span className="text-xs text-muted">
          Scanned {state.scanned} · {state.created} new · {state.updated} updated ·{" "}
          {state.summarized} summarized · {state.deadlines} deadlines
        </span>
      ) : null}
    </form>
  );
}
