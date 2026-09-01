import { createHash } from "node:crypto";
import type { EmbeddingKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { aiConfigured, env } from "@/lib/env";
import { embed, embedOne, cosineSim } from "@/lib/ai/embed";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** The text blob we embed / keyword-scan for each record type. */
function applicationDoc(a: {
  role: string;
  seniority: string | null;
  location: string | null;
  notes: string | null;
  jdSummary: string | null;
  jdRequirements: string[];
  jdTechStack: string[];
  jdText: string | null;
  company: { name: string };
}) {
  return [
    `${a.role} at ${a.company.name}`,
    a.seniority,
    a.location,
    a.jdSummary,
    a.jdRequirements.join(", "),
    a.jdTechStack.join(", "),
    a.notes,
    a.jdText?.slice(0, 4000),
  ]
    .filter(Boolean)
    .join("\n");
}

function threadDoc(t: {
  subject: string | null;
  summary: string | null;
  category: string | null;
}) {
  return [t.subject, t.category, t.summary].filter(Boolean).join("\n");
}

export type IndexResult = { applications: number; threads: number; skipped: number };

/** Rebuild the embedding index, skipping records whose text hasn't changed. */
export async function reindex(): Promise<IndexResult> {
  if (!aiConfigured) throw new Error("OPENAI_API_KEY is required to build the index.");

  const [apps, threads, existing] = await Promise.all([
    prisma.application.findMany({ include: { company: true } }),
    prisma.emailThread.findMany(),
    prisma.embedding.findMany({ select: { kind: true, refId: true, hash: true } }),
  ]);
  const hashOf = new Map(existing.map((e) => [`${e.kind}:${e.refId}`, e.hash]));

  const pending: { kind: EmbeddingKind; refId: string; content: string }[] = [];
  for (const a of apps) {
    const content = applicationDoc(a);
    if (hashOf.get(`APPLICATION:${a.id}`) !== sha(content))
      pending.push({ kind: "APPLICATION", refId: a.id, content });
  }
  for (const t of threads) {
    const content = threadDoc(t);
    if (!content.trim()) continue;
    if (hashOf.get(`EMAIL_THREAD:${t.id}`) !== sha(content))
      pending.push({ kind: "EMAIL_THREAD", refId: t.id, content });
  }

  let applications = 0;
  let threadCount = 0;

  // Batch embeddings (OpenAI accepts arrays); chunk to stay well under limits.
  for (let i = 0; i < pending.length; i += 64) {
    const chunk = pending.slice(i, i + 64);
    const vectors = await embed(chunk.map((c) => c.content));
    await Promise.all(
      chunk.map((c, j) =>
        prisma.embedding.upsert({
          where: { kind_refId: { kind: c.kind, refId: c.refId } },
          create: {
            kind: c.kind,
            refId: c.refId,
            content: c.content,
            vector: vectors[j],
            model: env.openaiEmbedModel,
            hash: sha(c.content),
          },
          update: {
            content: c.content,
            vector: vectors[j],
            model: env.openaiEmbedModel,
            hash: sha(c.content),
          },
        }),
      ),
    );
    for (const c of chunk) {
      if (c.kind === "APPLICATION") applications++;
      else threadCount++;
    }
  }

  // Drop embeddings whose source row is gone.
  const liveApp = new Set(apps.map((a) => a.id));
  const liveThread = new Set(threads.map((t) => t.id));
  await prisma.embedding.deleteMany({
    where: {
      OR: [
        { kind: "APPLICATION", refId: { notIn: [...liveApp] } },
        { kind: "EMAIL_THREAD", refId: { notIn: [...liveThread] } },
      ],
    },
  });

  return {
    applications,
    threads: threadCount,
    skipped: apps.length + threads.length - pending.length,
  };
}

export type SearchHit = {
  kind: EmbeddingKind;
  refId: string;
  score: number; // 0..1 for semantic, 0 for keyword
  title: string;
  subtitle: string;
  snippet: string;
  href: string;
};

export type SearchResponse = {
  mode: "semantic" | "keyword";
  hits: SearchHit[];
  indexed: number;
};

export async function search(
  query: string,
  limit = 12,
): Promise<SearchResponse> {
  const q = query.trim();
  if (!q) return { mode: aiConfigured ? "semantic" : "keyword", hits: [], indexed: 0 };

  const indexed = await prisma.embedding.count();

  if (aiConfigured && indexed > 0) {
    const qv = await embedOne(q);
    const rows = await prisma.embedding.findMany();
    const ranked = rows
      .map((r) => ({ r, score: cosineSim(qv, r.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    const hits = await hydrate(
      ranked.map(({ r, score }) => ({ kind: r.kind, refId: r.refId, score, content: r.content })),
    );
    return { mode: "semantic", hits, indexed };
  }

  // Keyword fallback — no embeddings needed. Data is small (single-user app),
  // so scan the same composed docs the semantic index uses, case-insensitively.
  const needle = q.toLowerCase();
  const [apps, threads] = await Promise.all([
    prisma.application.findMany({ include: { company: true } }),
    prisma.emailThread.findMany(),
  ]);

  const hits: SearchHit[] = [
    ...apps
      .filter((a) => applicationDoc(a).toLowerCase().includes(needle))
      .slice(0, limit)
      .map((a) => ({
        kind: "APPLICATION" as const,
        refId: a.id,
        score: 0,
        title: a.role,
        subtitle: a.company.name,
        snippet: a.jdSummary ?? a.notes ?? "",
        href: `/applications/${a.id}`,
      })),
    ...threads
      .filter((t) => threadDoc(t).toLowerCase().includes(needle))
      .slice(0, limit)
      .map((t) => ({
        kind: "EMAIL_THREAD" as const,
        refId: t.id,
        score: 0,
        title: t.subject ?? "(no subject)",
        subtitle: "email thread",
        snippet: t.summary ?? "",
        href: `/inbox/${t.id}`,
      })),
  ];
  return { mode: "keyword", hits, indexed };
}

async function hydrate(
  items: { kind: EmbeddingKind; refId: string; score: number; content: string }[],
): Promise<SearchHit[]> {
  const appIds = items.filter((i) => i.kind === "APPLICATION").map((i) => i.refId);
  const threadIds = items.filter((i) => i.kind === "EMAIL_THREAD").map((i) => i.refId);

  const [apps, threads] = await Promise.all([
    prisma.application.findMany({
      where: { id: { in: appIds } },
      include: { company: true },
    }),
    prisma.emailThread.findMany({ where: { id: { in: threadIds } } }),
  ]);
  const appById = new Map(apps.map((a) => [a.id, a]));
  const threadById = new Map(threads.map((t) => [t.id, t]));

  const hits: SearchHit[] = [];
  for (const it of items) {
    if (it.kind === "APPLICATION") {
      const a = appById.get(it.refId);
      if (!a) continue;
      hits.push({
        kind: it.kind,
        refId: it.refId,
        score: it.score,
        title: a.role,
        subtitle: a.company.name,
        snippet: a.jdSummary ?? a.notes ?? it.content.slice(0, 200),
        href: `/applications/${a.id}`,
      });
    } else {
      const t = threadById.get(it.refId);
      if (!t) continue;
      hits.push({
        kind: it.kind,
        refId: it.refId,
        score: it.score,
        title: t.subject ?? "(no subject)",
        subtitle: "email thread",
        snippet: t.summary ?? it.content.slice(0, 200),
        href: `/inbox/${t.id}`,
      });
    }
  }
  return hits;
}
