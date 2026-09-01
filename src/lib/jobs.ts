/**
 * Public job-board fetchers. Greenhouse, Lever and Ashby all expose a
 * company-scoped board endpoint with no API key, keyed by the company's
 * board token (the slug in their careers URL).
 */

export type FetchedListing = {
  source: string;
  externalId: string | null;
  company: string;
  title: string;
  location: string | null;
  remote: boolean | null;
  url: string;
  description: string | null;
  postedAt: Date | null;
  salaryText: string | null;
};

export type BoardSource = "greenhouse" | "lever" | "ashby";

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function htmlToText(html: string | undefined | null): string | null {
  if (!html) return null;
  // Greenhouse double-encodes: decode entities first, then strip the real tags.
  const decoded = decodeEntities(decodeEntities(html));
  const text = decoded
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 6000) || null;
}

export function looksRemote(s: string | null): boolean | null {
  if (!s) return null;
  return /remote|anywhere|distributed/i.test(s) ? true : null;
}

async function fetchGreenhouse(token: string): Promise<FetchedListing[]> {
  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`Greenhouse board "${token}" → ${res.status}`);
  const json = (await res.json()) as {
    jobs: {
      id: number;
      title: string;
      absolute_url: string;
      updated_at: string;
      location?: { name?: string };
      content?: string;
      company_name?: string;
    }[];
  };
  return json.jobs.map((j) => ({
    source: "greenhouse",
    externalId: String(j.id),
    company: j.company_name || token,
    title: j.title,
    location: j.location?.name ?? null,
    remote: looksRemote(j.location?.name ?? null),
    url: j.absolute_url,
    description: htmlToText(j.content),
    postedAt: j.updated_at ? new Date(j.updated_at) : null,
    salaryText: null,
  }));
}

async function fetchLever(token: string): Promise<FetchedListing[]> {
  const res = await fetch(
    `https://api.lever.co/v0/postings/${token}?mode=json`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`Lever board "${token}" → ${res.status}`);
  const json = (await res.json()) as {
    id: string;
    text: string;
    hostedUrl: string;
    createdAt: number;
    categories?: { location?: string; team?: string; commitment?: string };
    descriptionPlain?: string;
    salaryRange?: { min?: number; max?: number; currency?: string };
  }[];
  return json.map((j) => ({
    source: "lever",
    externalId: j.id,
    company: token,
    title: j.text,
    location: j.categories?.location ?? null,
    remote: looksRemote(j.categories?.location ?? null),
    url: j.hostedUrl,
    description: (j.descriptionPlain ?? "").slice(0, 6000) || null,
    postedAt: j.createdAt ? new Date(j.createdAt) : null,
    salaryText: j.salaryRange?.min
      ? `${j.salaryRange.currency ?? "$"}${j.salaryRange.min}–${j.salaryRange.max}`
      : null,
  }));
}

async function fetchAshby(token: string): Promise<FetchedListing[]> {
  const res = await fetch(
    `https://api.ashbyhq.com/posting-api/job-board/${token}?includeCompensation=true`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error(`Ashby board "${token}" → ${res.status}`);
  const json = (await res.json()) as {
    jobs: {
      id: string;
      title: string;
      location?: string;
      isRemote?: boolean;
      jobUrl: string;
      publishedAt?: string;
      descriptionPlain?: string;
      compensation?: { summaryComponents?: { summary?: string }[] };
    }[];
  };
  return (json.jobs ?? []).map((j) => ({
    source: "ashby",
    externalId: j.id,
    company: token,
    title: j.title,
    location: j.location ?? null,
    remote: j.isRemote ?? looksRemote(j.location ?? null),
    url: j.jobUrl,
    description: (j.descriptionPlain ?? "").slice(0, 6000) || null,
    postedAt: j.publishedAt ? new Date(j.publishedAt) : null,
    salaryText:
      j.compensation?.summaryComponents?.map((c) => c.summary).filter(Boolean).join(" · ") ||
      null,
  }));
}

export async function fetchBoard(
  source: BoardSource,
  token: string,
): Promise<FetchedListing[]> {
  const clean = token.trim().replace(/^https?:\/\/.*\//, "").replace(/\/$/, "");
  if (source === "greenhouse") return fetchGreenhouse(clean);
  if (source === "lever") return fetchLever(clean);
  return fetchAshby(clean);
}
