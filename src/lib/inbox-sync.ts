import { prisma } from "@/lib/prisma";
import { aiConfigured } from "@/lib/env";
import { getThread, listJobThreadIds, type GmailThread } from "@/lib/gmail";
import { summarizeThread } from "@/lib/ai/summarize-thread";
import { disambiguateByRole } from "@/lib/application-match";

export type SyncResult = {
  error?: string;
  scanned?: number;
  created?: number;
  updated?: number;
  summarized?: number;
  deadlines?: number;
  interviews?: number;
};

/**
 * Try to attach a thread to an existing application by company-name match.
 * When a company has more than one tracked application (two Google roles,
 * say), pick the one whose role text actually matches the thread — never
 * just the most recently updated one. If the role text can't disambiguate
 * (tie, or no overlap), return null rather than guess: the thread stays
 * unlinked and the user resolves it from the dropdown on the thread page.
 */
async function guessApplication(
  companyGuess: string | null | undefined,
  roleGuess: string | null | undefined,
  subject: string | null,
  fromEmail: string | undefined,
): Promise<string | null> {
  const candidates: string[] = [];
  if (companyGuess) candidates.push(companyGuess.trim());
  const domain = fromEmail?.split("@")[1]?.split(".")[0];
  if (domain && domain.length > 2) candidates.push(domain);

  const signalText = [roleGuess, subject].filter(Boolean).join(" ");

  for (const c of candidates) {
    const apps = await prisma.application.findMany({
      where: { company: { name: { contains: c, mode: "insensitive" } } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, role: true },
    });
    if (apps.length === 0) continue;
    return disambiguateByRole(apps, signalText);
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
    existingApplicationId: existing?.applicationId ?? null,
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
  let interviews = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const id of ids) {
    let t: GmailThread;
    try {
      t = await getThread(id);
    } catch {
      continue;
    }
    if (t.messages.length === 0) continue;

    const {
      threadRowId,
      isNew,
      hasNewMessages,
      alreadySummarized,
      existingApplicationId,
    } = await persistThread(t);
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

      // A thread that's already linked keeps its link — whether that came
      // from a previous good guess or a manual correction — rather than
      // re-guessing (and possibly flipping) it on every new reply.
      const appId =
        existingApplicationId ??
        (await guessApplication(
          data.company,
          data.role,
          t.subject,
          t.messages[0]?.from.email,
        ));

      await prisma.emailThread.update({
        where: { id: threadRowId },
        data: {
          summary: data.summary,
          category: data.category,
          guessedCompany: data.company ?? null,
          guessedRole: data.role ?? null,
          actionNeeded: data.actionNeeded,
          actionNote: data.actionNote ?? null,
          possiblePhishing: data.possiblePhishing,
          phishingReason: data.phishingReason ?? null,
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

      // Interview.applicationId is required, so only auto-create when the
      // thread actually resolved to one application (never guess here).
      if (data.interview && appId) {
        const scheduledAt = new Date(data.interview.scheduledAt);
        if (!Number.isNaN(scheduledAt.getTime())) {
          const source = `email:${t.id}`;
          const dupe = await prisma.interview.findFirst({
            where: { applicationId: appId, source },
          });
          if (!dupe) {
            await prisma.interview.create({
              data: {
                applicationId: appId,
                type: data.interview.type,
                scheduledAt,
                durationMin: data.interview.durationMin ?? undefined,
                location: data.interview.location ?? undefined,
                withNames: data.interview.withNames ?? [],
                source,
              },
            });
            interviews++;
          } else if (dupe.scheduledAt?.getTime() !== scheduledAt.getTime()) {
            // A later message in the same thread rescheduled it — update in
            // place rather than creating a second interview for one thread.
            await prisma.interview.update({
              where: { id: dupe.id },
              data: {
                type: data.interview.type,
                scheduledAt,
                durationMin: data.interview.durationMin ?? undefined,
                location: data.interview.location ?? undefined,
                withNames: data.interview.withNames ?? [],
              },
            });
          }
        }
      }
    } catch {
      // summary is best-effort; the thread is already stored
    }
  }

  return { scanned: ids.length, created, updated, summarized, deadlines, interviews };
}
