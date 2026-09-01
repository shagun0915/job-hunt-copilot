import { fmtDateTime } from "@/lib/utils";

type Rewrite = {
  section: string;
  before?: string | null;
  after: string;
  keywordsFolded?: string[];
};

export type AtsReviewData = {
  id: string;
  resumeLabel: string;
  createdAt: string;
  model: string | null;
  scoreBefore: number;
  scoreAfter: number;
  scoreRationale: string | null;
  titleAlignment: string | null;
  autoPicked: boolean;
  pickReason: string | null;
  matched: string[];
  hardRequirementsGaps: string[];
  niceToHaveGaps: string[];
  formattingFlags: string[];
  uncloseableGaps: string[];
  rewrites: Rewrite[];
  verdict: string | null;
};

function scoreColor(s: number) {
  return s >= 70
    ? "text-emerald-500"
    : s >= 45
      ? "text-amber-500"
      : "text-rose-500";
}

export function AtsReview({ m }: { m: AtsReviewData }) {
  const delta = m.scoreAfter - m.scoreBefore;

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            {m.resumeLabel}
            {m.autoPicked && (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary dark:text-indigo-300">
                auto-picked
              </span>
            )}
          </p>
          <p className="text-xs text-muted">
            {fmtDateTime(m.createdAt)} · {m.model}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm tabular-nums">
          <span className={scoreColor(m.scoreBefore)}>{m.scoreBefore}</span>
          <span className="text-muted">→</span>
          <span className={`text-lg font-semibold ${scoreColor(m.scoreAfter)}`}>
            {m.scoreAfter}
          </span>
          {delta !== 0 && (
            <span
              className={
                delta > 0
                  ? "text-xs text-emerald-500"
                  : "text-xs text-rose-500"
              }
            >
              {delta > 0 ? "+" : ""}
              {delta}
            </span>
          )}
        </div>
      </div>

      {m.autoPicked && m.pickReason && (
        <p className="mt-1 text-xs text-muted">Why this résumé: {m.pickReason}</p>
      )}
      {m.titleAlignment && (
        <p className="mt-1 text-xs text-muted">Title: {m.titleAlignment}</p>
      )}
      {m.scoreRationale && (
        <p className="mt-2 text-sm text-muted">{m.scoreRationale}</p>
      )}
      {m.verdict && <p className="mt-2 text-sm">{m.verdict}</p>}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Bullets
          title="Missing — hard requirements"
          items={m.hardRequirementsGaps}
          tone="danger"
        />
        <Bullets title="Missing — nice to have" items={m.niceToHaveGaps} />
      </div>

      {m.uncloseableGaps.length > 0 && (
        <div className="mt-3 rounded-md bg-rose-50 p-2 dark:bg-rose-950/40">
          <p className="text-xs font-medium uppercase tracking-wide text-rose-600 dark:text-rose-400">
            Can&apos;t be closed honestly
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-rose-700 dark:text-rose-300">
            {m.uncloseableGaps.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
      )}

      {m.formattingFlags.length > 0 && (
        <Bullets
          title="Formatting flags"
          items={m.formattingFlags}
          className="mt-3"
        />
      )}

      {m.rewrites.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted hover:text-foreground">
            Suggested résumé rewrites ({m.rewrites.length})
          </summary>
          <div className="mt-2 space-y-3">
            {m.rewrites.map((r, i) => (
              <div key={i} className="rounded-md bg-surface-2 p-2 text-sm">
                <p className="text-xs font-medium text-muted">{r.section}</p>
                {r.before && (
                  <p className="mt-1 text-muted line-through decoration-rose-400/60">
                    {r.before}
                  </p>
                )}
                <p className="mt-1">{r.after}</p>
                {r.keywordsFolded && r.keywordsFolded.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {r.keywordsFolded.map((k, j) => (
                      <span
                        key={j}
                        className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary dark:text-indigo-300"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {m.matched.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted hover:text-foreground">
            Already covered ({m.matched.length})
          </summary>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {m.matched.map((x, i) => (
              <span
                key={i}
                className="rounded-md bg-surface-2 px-2 py-0.5 text-xs text-muted"
              >
                {x}
              </span>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Bullets({
  title,
  items,
  tone,
  className,
}: {
  title: string;
  items: string[];
  tone?: "danger";
  className?: string;
}) {
  if (!items?.length) return null;
  return (
    <div className={className}>
      <p
        className={`mb-1 text-xs font-medium uppercase tracking-wide ${
          tone === "danger" ? "text-rose-600 dark:text-rose-400" : "text-muted"
        }`}
      >
        {title}
      </p>
      <ul className="list-disc space-y-0.5 pl-5 text-sm">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
