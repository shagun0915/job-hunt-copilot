import { prisma } from "@/lib/prisma";
import { aiConfigured } from "@/lib/env";
import { getThread, listJobThreadIds, type GmailThread } from "@/lib/gmail";
import { summarizeThread } from "@/lib/ai/summarize-thread";

export type SyncResult = {
  error?: string;
  scanned?: number;
  created?: number;
  updated?: number;
  summarized?: number;
  deadlines?: number;
};

/** Try to attach a thread to an existing application by company-name match. */
async function guessApplication(
  companyGuess: string | null | undefined,
  fromEmail: string | undefined,
): Promise<string | null> {
  const candidates: string[] = [];
  if (companyGuess) candidates.push(companyGuess.trim());
  const domain = fromEmail?.split("@")[1]?.split(".")[0];
  if (domain && domain.length > 2) candidates.push(domain);

  for (const c of candidates) {
    const app = await prisma.application.findFirst({
      where: { company: { name: { contains: c, mode: "insensitive" } } },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (app) return app.id;
  }
  return null;
}

async function persistThread(t: GmailThread) {
  const existing = await prisma.emailThread.findUnique({
    where: { gmailThreadId: t.id },
    include: { messages: { select: { gmailMsgId: true } } },
  });

  const thread = await prisma.emailThread.upsert({
    where: { gmailThreadId: t.id },
    create: {
      gmailThreadId: t.id,
      subject: t.subject,
      lastMessageAt: t.lastMessageAt,
    },
    update: { subject: t.subject, lastMessageAt: t.lastMessageAt },
  });

  const known = new Set(existing?.messages.map((m) => m.gmailMsgId) ?? []);
  const newMsgs = t.messages.filter((m) => !known.has(m.id));

  for (const m of newMsgs) {
    await prisma.emailMessage.create({
      data: {
        threadId: thread.id,
        gmailMsgId: m.id,
        direction: "INBOUND",
        fromEmail: m.from.email || null,
        fromName: m.from.name || null,
        toEmails: m.to,
        sentAt: m.date,
        snippet: m.snippet,
        bodyText: m.bodyText,
      },
    });
  }

  return {
    threadRowId: thread.id,
    isNew: !existing,
    hasNewMessages: newMsgs.length > 0,
    alreadySummarized: Boolean(existing?.summarizedAt),
  };
}

/**
 * Pull recent job-search threads from Gmail, persist them, and (when AI is
 * configured) summarize new/changed threads, link them to applications, and
 * extract deadlines. Caller is responsible for auth and cache revalidation.
 */
export async function runInboxSync(maxThreads = 15): Promise<SyncResult> {
  let ids: string[];
  try {
    ids = await listJobThreadIds(maxThreads);
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Could not reach Gmail. Re-connect Google.",
    };
  }

  let created = 0;
  let updated = 0;
  let summarized = 0;
  let deadlines = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const id of ids) {
    let t: GmailThread;
    try {
      t = await getThread(id);
    } catch {
      continue;
    }
    if (t.messages.length === 0) continue;

    const { threadRowId, isNew, hasNewMessages, alreadySummarized } =
      await persistThread(t);
    if (isNew) created++;
    else if (hasNewMessages) updated++;

    const shouldSummarize =
      aiConfigured && (isNew || hasNewMessages || !alreadySummarized);
    if (!shouldSummarize) continue;

    try {
      const { data } = await summarizeThread({
        subject: t.subject,
        today,
        messages: t.messages.map((m) => ({
          from: `${m.from.name || m.from.email}`,
          date: m.date?.toISOString().slice(0, 10) ?? "unknown",
          body: m.bodyText || m.snippet,
        })),
      });

      const appId = await guessApplication(
        data.company,
        t.messages[0]?.from.email,
      );

      await prisma.emailThread.update({
        where: { id: threadRowId },
        data: {
          summary: data.summary,
          category: data.category,
          actionNeeded: data.actionNeeded,
          actionNote: data.actionNote ?? null,
          summarizedAt: new Date(),
          applicationId: appId ?? undefined,
        },
      });
      summarized++;

      if (data.deadline) {
        const dueAt = new Date(data.deadline.dueAt);
        if (!Number.isNaN(dueAt.getTime())) {
          const dupe = await prisma.deadline.findFirst({
            where: {
              title: data.deadline.title,
              dueAt,
              source: `email:${t.id}`,
            },
          });
          if (!dupe) {
            await prisma.deadline.create({
              data: {
                applicationId: appId ?? undefined,
                title: data.deadline.title,
                type: data.deadline.type,
                dueAt,
                source: `email:${t.id}`,
                notes: `Auto-detected from email: ${t.subject ?? ""}`.trim(),
              },
            });
            deadlines++;
          }
        }
      }
    } catch {
      // summary is best-effort; the thread is already stored
    }
  }

  return { scanned: ids.length, created, updated, summarized, deadlines };
}
