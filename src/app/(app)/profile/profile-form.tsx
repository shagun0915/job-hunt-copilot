"use client";

import { useActionState } from "react";
import { saveProfile, type ProfileState } from "@/lib/actions/profile";
import { Button, Field, Input, Textarea } from "@/components/ui";

type Profile = {
  fullName: string | null;
  headline: string | null;
  location: string | null;
  availability: string | null;
  statusNote: string | null;
  doNotClaim: string[];
} | null;

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    saveProfile,
    {},
  );

  return (
    <form action={action} className="max-w-xl space-y-4">
      {state.error && (
        <p className="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-emerald-100 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          Saved.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input name="fullName" defaultValue={profile?.fullName ?? ""} />
        </Field>
        <Field label="Location">
          <Input
            name="location"
            defaultValue={profile?.location ?? ""}
            placeholder="Bengaluru, India"
          />
        </Field>
      </div>

      <Field label="Headline">
        <Input
          name="headline"
          defaultValue={profile?.headline ?? ""}
          placeholder="Dynamics 365 / Power Platform Developer"
        />
      </Field>

      <Field label="Availability">
        <Input
          name="availability"
          defaultValue={profile?.availability ?? ""}
          placeholder="Immediately available"
        />
      </Field>

      <Field
        label="Employment status note"
        hint="Kept accurate in every draft and résumé rewrite — e.g. don't imply you still work somewhere you've left."
      >
        <Textarea
          name="statusNote"
          defaultValue={profile?.statusNote ?? ""}
          placeholder="Laid off from Visa (Aug 2025, org restructuring). Do not say 'currently at Visa'."
        />
      </Field>

      <Field
        label="Never claim these"
        hint="Comma or newline separated. The AI will never assert these skills/tools/experience in a résumé rewrite or message."
      >
        <Textarea
          name="doNotClaim"
          defaultValue={(profile?.doNotClaim ?? []).join(", ")}
          placeholder="TypeScript, Kubernetes, Power BI, SharePoint"
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
