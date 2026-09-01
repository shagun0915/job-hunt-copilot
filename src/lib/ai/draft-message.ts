import { z } from "zod";
import type { DraftKind } from "@prisma/client";
import { chatJSON } from "@/lib/openai";

const schema = z.object({
  subject: z.string().nullable().optional(),
  shortNote: z.string().nullable().optional(), // ≤300 chars: LinkedIn connection request
  body: z.string(),
});

export type DraftResult = z.infer<typeof schema>;

const KIND_BRIEF: Record<DraftKind, string> = {
  COVER_LETTER:
    "A concise cover letter (250–320 words). Open with a specific reason for this role/company, then 2 short paragraphs mapping concrete résumé achievements to the top job requirements, then a brief close. No 'To whom it may concern'. subject = null.",
  RECRUITER_REPLY:
    "A short, warm reply to a recruiter who reached out (90–130 words). Genuine interest, 2 relevant highlights, propose a call. Fill `subject`. If recipient context is given, reference their note/role naturally.",
  REFERRAL_ASK:
    "A warm referral ask to someone at the company. Fill `shortNote` with a ≤300-character LinkedIn connection-request note (3 sentences: who you are, the specific role, one line of fit — friendly, not pushy, not transactional; a slightly informal human tone beats something over-polished). Fill `body` with the fuller message to send AFTER they accept (~120 words). subject = null.",
  COLD_OUTREACH:
    "Cold outreach to a hiring manager / recruiter with no prior connection. Fill `shortNote` with a ≤300-char connection request. Fill `body` with a personalized note (~130 words) that references the recipient's role/work (from recipient context) and ties it to the candidate's background. Fill `subject` for the email version.",
  APPLICATION_EMAIL:
    "A direct application email to an address in the JD. Fill `subject` (e.g. 'Application — <role> — <name>'). `body` ~120–160 words: interest, 3 relevant highlights, note that the tailored résumé is attached, availability. shortNote = null.",
  FOLLOW_UP:
    "A short, polite follow-up on an application that's gone quiet (70–110 words). Reaffirm interest, add one new relevant detail, ask about timeline. Fill `subject`. shortNote = null.",
};

const SYSTEM = `You draft job-search messages. Write in first person, plain and specific — no buzzwords, no flattery, no "AI voice", no heavy em-dashes.
Use ONLY facts in the résumé, job description, and CANDIDATE FACTS. Never invent employers, numbers, tools, or credentials. Never contradict the CANDIDATE FACTS (employment status, availability, things not to claim).
Leave a clearly bracketed placeholder like [recruiter name] only when a needed detail is genuinely unknown.
Return ONLY JSON: { "subject": string|null, "shortNote": string|null, "body": string }.`;

export async function draftMessage({
  kind,
  role,
  company,
  jdText,
  requirements,
  resumeText,
  instructions,
  contactName,
  recipientContext,
  candidateFacts,
}: {
  kind: DraftKind;
  role: string;
  company: string;
  jdText?: string | null;
  requirements?: string[];
  resumeText?: string | null;
  instructions?: string | null;
  contactName?: string | null;
  recipientContext?: string | null;
  candidateFacts?: string;
}): Promise<{ data: DraftResult; model: string }> {
  const jd =
    jdText?.trim().slice(0, 6000) ||
    (requirements?.length
      ? `Key requirements:\n- ${requirements.join("\n- ")}`
      : "(no job description provided)");

  const user = `TASK: ${KIND_BRIEF[kind]}

ROLE: ${role} at ${company}
${contactName ? `RECIPIENT NAME: ${contactName}` : ""}
${recipientContext ? `RECIPIENT CONTEXT: ${recipientContext.slice(0, 800)}` : ""}
${candidateFacts ? `\n${candidateFacts}\n` : ""}
JOB DESCRIPTION:
"""
${jd}
"""

RÉSUMÉ:
"""
${(resumeText ?? "(no résumé on file — keep claims generic and truthful)").slice(0, 8000)}
"""
${instructions ? `\nEXTRA INSTRUCTIONS FROM THE CANDIDATE:\n${instructions.slice(0, 1000)}` : ""}`;

  return chatJSON({ system: SYSTEM, user, schema, maxTokens: 1300 });
}
