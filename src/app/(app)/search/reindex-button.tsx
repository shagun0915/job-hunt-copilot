"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { reindexAction, type ReindexState } from "@/lib/actions/search";
import { Button } from "@/components/ui";

export function ReindexButton({ indexed }: { indexed: number }) {
  const [state, action, pending] = useActionState<ReindexState, FormData>(
    reindexAction,
    {},
  );

  return (
    <form action={action} className="flex items-center gap-2">
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Indexing…" : indexed > 0 ? "Re-index" : "Build index"}
      </Button>
      {state.error ? (
        <span className="text-xs text-rose-500">{state.error}</span>
      ) : state.result ? (
        <span className="text-xs text-muted">
          {state.result.applications + state.result.threads} updated,{" "}
          {state.result.skipped} unchanged
        </span>
      ) : (
        <span className="text-xs text-muted">{indexed} items indexed</span>
      )}
    </form>
  );
}
