import { prisma } from "@/lib/prisma";
import { authConfigured, env } from "@/lib/env";

export class GmailNotConnectedError extends Error {
  constructor(msg = "Gmail is not connected. Sign in with Google first.") {
    super(msg);
    this.name = "GmailNotConnectedError";
  }
}

type GoogleAccount = {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
};

async function getGoogleAccount(): Promise<GoogleAccount> {
  if (!authConfigured) throw new GmailNotConnectedError();
  const account = await prisma.account.findFirst({
    where: { provider: "google" },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      expires_at: true,
    },
  });
  if (!account) throw new GmailNotConnectedError();
  return account;
}

/** Return a valid access token, refreshing via the Google token endpoint if stale. */
async function getAccessToken(): Promise<string> {
  const account = await getGoogleAccount();
  const now = Math.floor(Date.now() / 1000);

  if (account.access_token && account.expires_at && account.expires_at - 60 > now) {
    return account.access_token;
  }
  if (!account.refresh_token) {
    throw new GmailNotConnectedError(
      "No refresh token stored — sign out and sign in again to grant offline access.",
    );
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.googleId,
      client_secret: env.googleSecret,
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });
  if (!res.ok) {
    throw new GmailNotConnectedError(
      `Token refresh failed (${res.status}). Re-connect Google.`,
    );
  }
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: json.access_token,
      expires_at: now + json.expires_in,
    },
  });
  return json.access_token;
}

async function gmail<T>(path: string, params?: Record<string, string>): Promise<T> {
  const token = await getAccessToken();
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`);
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Gmail API ${path} → ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

/** Broad query that catches most job-search correspondence. */
export const JOB_QUERY =
  'newer_than:90d (category:primary OR category:updates) ' +
  '(subject:(interview OR "online assessment" OR "coding challenge" OR application OR "next steps" OR recruiter OR "phone screen" OR offer OR "take-home" OR "take home") ' +
  'OR from:(greenhouse.io OR lever.co OR ashbyhq.com OR myworkday.com OR hire.lever.co OR workday OR icims.com OR smartrecruiters.com))';

export type GmailMessage = {
  id: string;
  threadId: string;
  from: { name: string; email: string };
  to: string[];
  date: Date | null;
  subject: string | null;
  snippet: string;
  bodyText: string;
};

export type GmailThread = {
  id: string;
  subject: string | null;
  messages: GmailMessage[];
  lastMessageAt: Date | null;
};

export async function listJobThreadIds(maxResults = 25): Promise<string[]> {
  const data = await gmail<{ threads?: { id: string }[] }>("threads", {
    q: JOB_QUERY,
    maxResults: String(maxResults),
  });
  return (data.threads ?? []).map((t) => t.id);
}

export async function getThread(id: string): Promise<GmailThread> {
  const data = await gmail<GmailRawThread>(`threads/${id}`, { format: "full" });
  const messages = (data.messages ?? []).map(parseMessage);
  const lastMessageAt =
    messages.reduce<Date | null>(
      (acc, m) => (m.date && (!acc || m.date > acc) ? m.date : acc),
      null,
    ) ?? null;
  return {
    id,
    subject: messages[0]?.subject ?? null,
    messages,
    lastMessageAt,
  };
}

/* --------------------------- raw payload parsing --------------------------- */

type GmailRawThread = { messages?: GmailRawMessage[] };
type GmailRawMessage = {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  payload?: GmailPart;
};
type GmailPart = {
  mimeType?: string;
  filename?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
};

function header(msg: GmailRawMessage, name: string): string | null {
  const h = msg.payload?.headers?.find(
    (x) => x.name.toLowerCase() === name.toLowerCase(),
  );
  return h?.value ?? null;
}

export function parseAddress(raw: string | null): { name: string; email: string } {
  if (!raw) return { name: "", email: "" };
  const m = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim(), email: m[2].trim().toLowerCase() };
  return { name: "", email: raw.trim().toLowerCase() };
}

export function decodeB64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf8",
  );
}

export function extractBody(part: GmailPart | undefined): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeB64Url(part.body.data);
  }
  if (part.parts) {
    // prefer text/plain, fall back to stripped text/html
    const plain = part.parts.find((p) => p.mimeType === "text/plain");
    if (plain) return extractBody(plain);
    const nested = part.parts.map(extractBody).filter(Boolean);
    if (nested.length) return nested.join("\n");
    const html = part.parts.find((p) => p.mimeType === "text/html");
    if (html?.body?.data) return stripHtml(decodeB64Url(html.body.data));
  }
  if (part.mimeType === "text/html" && part.body?.data) {
    return stripHtml(decodeB64Url(part.body.data));
  }
  return "";
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseMessage(msg: GmailRawMessage): GmailMessage {
  const dateStr = header(msg, "date");
  const internal = msg.internalDate ? new Date(Number(msg.internalDate)) : null;
  const date = dateStr ? new Date(dateStr) : internal;
  return {
    id: msg.id,
    threadId: msg.threadId,
    from: parseAddress(header(msg, "from")),
    to: (header(msg, "to") ?? "")
      .split(",")
      .map((s) => parseAddress(s).email)
      .filter(Boolean),
    date: date && !Number.isNaN(date.getTime()) ? date : null,
    subject: header(msg, "subject"),
    snippet: msg.snippet ?? "",
    bodyText: extractBody(msg.payload).slice(0, 8000),
  };
}
