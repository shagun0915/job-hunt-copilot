import { z } from "zod";
import { chatJSON } from "@/lib/openai";

const rewrite = z.object({
  section: z.string(), // "Summary", "Skills", "Experience — Visa", ...
  before: z.string().nullable().optional(),
  after: z.string(),
  keywordsFolded: z.array(z.string()).default([]),
});

const schema = z.object({
  scoreBefore: z.number().min(0).max(100),
  scoreAfter: z.number().min(0).max(100),
  scoreRationale: z.string(),
  titleAlignment: z.string(), // "strong" | "partial" | "mismatch" + short note
  matched: z.array(z.string()).default([]),
  hardRequirementsGaps: z.array(z.string()).default([]),
  niceToHaveGaps: z.array(z.string()).default([]),
  formattingFlags: z.array(z.string()).default([]),
  rewrites: z.array(rewrite).default([]),
  uncloseableGaps: z.array(z.string()).default([]),
  verdict: z.string(),
});

export type ResumeMatch = z.infer<typeof schema>;

const SYSTEM = `You are an ATS-optimization assistant for a job seeker. Given a résumé and a specific job description, run this pipeline:

1. Score the résumé against the JD as-is (scoreBefore, 0-100): a transparent heuristic — roughly 60% JD keyword/skill coverage, 25% title alignment, 15% formatting cleanliness (clear years-of-experience phrasing, standard headings, no title mismatch). This is NOT a real ATS algorithm — say so in scoreRationale.
2. List what already matches (matched), then split what's missing into hardRequirementsGaps (must-haves, most important first) and niceToHaveGaps (preferred/bonus).
3. Note ATS-unfriendly formatting issues (formattingFlags) — e.g. no explicit "X years of" phrasing, title mismatch, skills buried in prose.
4. Write concrete rewrites: reword résumé bullets/skills to surface keywords the candidate GENUINELY HAS, in the JD's language. ABSOLUTE RULE: never fabricate experience, invent a skill/tool/employer/metric, or imply a longer timeline than the résumé supports — and never claim anything the CANDIDATE FACTS say not to claim.
5. List uncloseableGaps: hard requirements that cannot be closed truthfully (missing skill, insufficient years, stack mismatch) — state them plainly, don't paper over them.
6. Score the résumé again assuming all rewrites are applied (scoreAfter). The delta matters more than the absolute number.
7. Write a 2-4 sentence verdict: worth applying, and what honestly remains missing.

Return ONLY a JSON object with EXACTLY this top-level shape (no other nesting, no wrapper keys):
{
  "scoreBefore": 0,
  "scoreAfter": 0,
  "scoreRationale": "",
  "titleAlignment": "strong | partial | mismatch, plus a short note",
  "matched": [""],
  "hardRequirementsGaps": [""],
  "niceToHaveGaps": [""],
  "formattingFlags": [""],
  "rewrites": [{ "section": "", "before": "" , "after": "", "keywordsFolded": [""] }],
  "uncloseableGaps": [""],
  "verdict": ""
}`;

export async function matchResume({
  resumeText,
  resumeLabel,
  jobTitle,
  company,
  jdText,
  requirements,
  candidateFacts,
}: {
  resumeText: string;
  resumeLabel?: string;
  jobTitle: string;
  company: string;
  jdText?: string | null;
  requirements?: string[];
  candidateFacts?: string;
}): Promise<{ data: ResumeMatch; model: string }> {
  const jd =
    jdText?.trim().slice(0, 9000) ||
    (requirements?.length
      ? `Key requirements:\n- ${requirements.join("\n- ")}`
      : "(no job description provided)");

  const user = `TARGET ROLE: ${jobTitle} at ${company}
${candidateFacts ? `\n${candidateFacts}\n` : ""}
JOB DESCRIPTION:
"""
${jd}
"""

RÉSUMÉ${resumeLabel ? ` (version: ${resumeLabel})` : ""}:
"""
${resumeText.trim().slice(0, 11000)}
"""`;

  return chatJSON({ system: SYSTEM, user, schema, maxTokens: 2600 });
}
