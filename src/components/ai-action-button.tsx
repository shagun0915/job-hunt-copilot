"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";

export type AiActionState = { error?: string; ok?: boolean };
type AiAction = (
  prev: AiActionState,
  formData: FormData,
) => Promise<AiActionState>;

/**
 * Submit button for a server action that calls the LLM. Runs through
 * useActionState so a failure (rate limit, timeout, bad JSON) renders inline
 * instead of throwing to the route error boundary.
 */
export function AiActionButton({
  action,
  hidden,
  children,
  pendingText = "Working…",
  variant = "secondary",
  size = "sm",
  extra,
}: {
  action: AiAction;
  hidden: Record<string, string>;
  children: React.ReactNode;
  pendingText?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  /** optional inputs/selects rendered inside the form before the button */
  extra?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<AiActionState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {extra}
      <Button type="submit" variant={variant} size={size} disabled={pending}>
        {pending ? pendingText : children}
      </Button>
      {state.error && (
        <span className="text-xs text-rose-500">{state.error}</span>
      )}
    </form>
  );
}
