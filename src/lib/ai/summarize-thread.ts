import { z } from "zod";
import { chatJSON } from "@/lib/openai";

const schema = z.object({
  summary: z.string(),
  category: z.enum([
    "recruiter_outreach",
    "application_ack",
    "interview_invite",
    "oa_invite",
    "scheduling",
    "rejection",
    "offer",
    "referral",
    "networking",
    "other",
  ]),
  company: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  actionNeeded: z.boolean(),
  actionNote: z.string().nullable().optional(),
  deadline: z
    .object({
      title: z.string(),
      dueAt: z.string(), // ISO date
      type: z.enum([
        "OA",
        "TAKE_HOME",
        "APPLICATION",
        "RESPOND_BY",
        "INTERVIEW_PREP",
        "OTHER",
      ]),
    })
    .nullable()
    .optional(),
});

export type ThreadSummary = z.infer<typeof schema>;

const SYSTEM = `You triage a single email thread from a software engineer's job search.
Return ONLY JSON:
- summary (string: 1-3 sentences, what this thread is about and where it stands)
- category (one of: recruiter_outreach, application_ack, interview_invite, oa_invite, scheduling, rejection, offer, referral, networking, other)
- company (string|null), role (string|null) if identifiable
- actionNeeded (boolean: does the candidate need to reply or do something?)
- actionNote (string|null: the specific next action, if any)
- deadline (object|null): if the thread implies a concrete deadline (OA due date, take-home window, "respond by", scheduling-by), return { title (string), dueAt (ISO 8601 date string), type (one of exactly: "OA", "TAKE_HOME", "APPLICATION", "RESPOND_BY", "INTERVIEW_PREP", "OTHER") }. Otherwise deadline is null.
Today's date is provided; resolve relative dates ("by Friday", "within 5 days") against it.`;

export async function summarizeThread({
  subject,
  messages,
  today,
}: {
  subject: string | null;
  messages: { from: string; date: string; body: string }[];
  today: string;
}): Promise<{ data: ThreadSummary; model: string }> {
  const transcript = messages
    .map(
      (m, i) =>
        `--- Message ${i + 1} — from ${m.from} on ${m.date} ---\n${m.body
          .trim()
          .slice(0, 4000)}`,
    )
    .join("\n\n");

  return chatJSON({
    system: SYSTEM,
    user: `Today: ${today}\nSubject: ${subject ?? "(none)"}\n\n${transcript.slice(
      0,
      14000,
    )}`,
    schema,
    maxTokens: 1200,
  });
}
