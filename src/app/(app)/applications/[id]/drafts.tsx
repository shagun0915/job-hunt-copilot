"use client";

import { useActionState, useState } from "react";
import { Copy, Check, Trash2 } from "lucide-react";
import {
  generateDraft,
  deleteDraft,
  type DraftState,
} from "@/lib/actions/drafts";
import { Button } from "@/components/ui";
import { fmtDateTime } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = {
  COVER_LETTER: "Cover letter",
  RECRUITER_REPLY: "Recruiter reply",
  REFERRAL_ASK: "Referral ask",
  COLD_OUTREACH: "Cold outreach",
  APPLICATION_EMAIL: "Application email",
  FOLLOW_UP: "Follow-up",
};

// kinds where naming the recipient / their background materially helps
const WANTS_RECIPIENT = new Set([
  "RECRUITER_REPLY",
  "REFERRAL_ASK",
  "COLD_OUTREACH",
]);

type Draft = {
  id: string;
  kind: string;
  subject: string | null;
  shortNote: string | null;
  body: string;
  model: string | null;
  createdAt: string;
};

export function DraftPanel({
  applicationId,
  drafts,
  aiEnabled,
}: {
  applicationId: string;
  drafts: Draft[];
  aiEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState<DraftState, FormData>(
    generateDraft,
    {},
  );
  const [kind, setKind] = useState("COVER_LETTER");

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">Drafts</h2>

      {aiEnabled ? (
        <form
          action={formAction}
          className="mb-4 space-y-2 rounded-lg border border-border p-3"
        >
          <input type="hidden" name="applicationId" value={applicationId} />
          <div className="flex flex-wrap items-center gap-2">
            <select
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="h-8 rounded-lg border border-border bg-surface px-2 text-sm"
            >
              {Object.entries(KIND_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Writing…" : "Generate"}
            </Button>
            <span className="text-xs text-muted">
              uses your default résumé, the JD & your profile
            </span>
          </div>

          {WANTS_RECIPIENT.has(kind) && (
            <textarea
              name="recipientContext"
              placeholder="Recipient — name, title, and anything about their background or what they said (e.g. “Priya, EM on the payments team; we both worked at Visa”)"
              className="min-h-[48px] w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
            />
          )}

          <textarea
            name="instructions"
            placeholder="Optional steer — “mention the referral from Sam”, “keep it under 150 words”, “lead with the Copilot Studio work”"
            className="min-h-[48px] w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
          />
          {state.error && (
            <p className="text-xs text-rose-500">{state.error}</p>
          )}
          {(kind === "REFERRAL_ASK" || kind === "COLD_OUTREACH") && (
            <p className="text-xs text-muted">
              Produces a short LinkedIn connection note + a longer message to send
              once they accept.
            </p>
          )}
        </form>
      ) : (
        <p className="mb-4 text-sm text-muted">
          Set <code>OPENAI_API_KEY</code> to draft cover letters and outreach.
        </p>
      )}

      <div className="space-y-3">
        {drafts.length === 0 && (
          <p className="text-sm text-muted">No drafts yet.</p>
        )}
        {drafts.map((d) => (
          <DraftCard key={d.id} draft={d} />
        ))}
      </div>
    </div>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="inline-flex items-center gap-1 rounded p-1 text-xs text-muted hover:bg-surface-2 hover:text-foreground"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" /> Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" /> {label}
        </>
      )}
    </button>
  );
}

function DraftCard({ draft }: { draft: Draft }) {
  const fullText = draft.subject
    ? `Subject: ${draft.subject}\n\n${draft.body}`
    : draft.body;

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs text-muted">
          <span className="font-medium text-foreground">
            {KIND_LABEL[draft.kind] ?? draft.kind}
          </span>{" "}
          · {fmtDateTime(draft.createdAt)} · {draft.model}
        </div>
        <form action={deleteDraft}>
          <input type="hidden" name="id" value={draft.id} />
          <button
            type="submit"
            className="rounded p-1 text-muted hover:text-rose-500"
            aria-label="Delete draft"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>

      {draft.shortNote && (
        <div className="mb-2 rounded-md bg-surface-2 p-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-muted">
              Connection note · {draft.shortNote.length}/300
            </span>
            <CopyButton text={draft.shortNote} label="Copy note" />
          </div>
          <p className="whitespace-pre-wrap text-sm">{draft.shortNote}</p>
        </div>
      )}

      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-muted">
          {draft.shortNote ? "Follow-up message" : "Message"}
        </span>
        <CopyButton text={fullText} label="Copy" />
      </div>
      {draft.subject && (
        <p className="mb-1 text-sm font-medium">Subject: {draft.subject}</p>
      )}
      <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground/90">
        {draft.body}
      </pre>
    </div>
  );
}
