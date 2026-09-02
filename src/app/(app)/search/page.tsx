import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { aiConfigured, env } from "@/lib/env";
import { search } from "@/lib/search";
import { Card, CardBody, EmptyState, PageHeader } from "@/components/ui";
import { ReindexButton } from "./reindex-button";

export const maxDuration = 60;
export const metadata = { title: "Search · Job Hunt Copilot" };

type SP = Promise<{ q?: string }>;

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const { q = "" } = await searchParams;
  const indexed = await prisma.embedding.count();
  const res = q ? await search(q, 15) : null;

  return (
    <div>
      <PageHeader
        title="Search"
        description={
          aiConfigured
            ? "Ask in plain language across every application, JD and email — e.g. “roles that wanted Kafka”, “who ghosted me after an onsite”."
            : "Keyword search across applications and email threads. Set OPENAI_API_KEY for semantic search."
        }
        actions={aiConfigured ? <ReindexButton indexed={indexed} /> : null}
      />

      <form method="get" className="mb-6">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            name="q"
            defaultValue={q}
            autoFocus
            placeholder="Search…"
            className="h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </form>

      {!res ? (
        aiConfigured && indexed === 0 ? (
          <EmptyState
            title="Index not built yet"
            description="Click “Build index” to embed your applications and emails for semantic search."
          />
        ) : null
      ) : res.hits.length === 0 ? (
        <EmptyState
          title={`No matches for “${q}”`}
          description={
            res.mode === "semantic" && res.indexed === 0
              ? "The semantic index is empty — build it first."
              : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted">
            {res.hits.length} result{res.hits.length === 1 ? "" : "s"} ·{" "}
            {res.mode === "semantic" ? "semantic" : "keyword"} match
          </p>
          {res.hits.map((h) => (
            <Link
              key={`${h.kind}-${h.refId}`}
              href={h.href}
              className="block rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{h.title}</p>
                  <p className="text-xs text-muted">{h.subtitle}</p>
                  {h.snippet && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted">
                      {h.snippet}
                    </p>
                  )}
                </div>
                {h.score > 0 && (
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    {(h.score * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {res?.mode === "semantic" && (
        <Card className="mt-6">
          <CardBody className="text-xs text-muted">
            Semantic results rank by cosine similarity of{" "}
            <code>{env.openaiEmbedModel}</code> vectors. New or edited
            applications/emails need a re-index to show up.
          </CardBody>
        </Card>
      )}
    </div>
  );
}
