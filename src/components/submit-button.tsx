"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";
import * as React from "react";

export function SubmitButton({
  children,
  pendingText,
  ...props
}: React.ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? (pendingText ?? "Working…") : children}
    </Button>
  );
}
