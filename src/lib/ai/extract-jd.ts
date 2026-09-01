import { z } from "zod";
import { chatJSON } from "@/lib/openai";

const schema = z.object({
  company: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  seniority: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  remote: z.boolean().nullable().optional(),
  salaryText: z.string().nullable().optional(),
  summary: z.string(),
  requirements: z.array(z.string()).default([]),
  niceToHaves: z.array(z.string()).default([]),
  techStack: z.array(z.string()).default([]),
  redFlags: z.array(z.string()).default([]),
});

export type ExtractedJD = z.infer<typeof schema>;

const SYSTEM = `You extract structured data from software / tech job descriptions.
Return ONLY a JSON object with these keys:
- company (string|null), role (string|null), seniority (string|null e.g. "Junior", "Senior", "Staff", "New grad")
- location (string|null), remote (boolean|null), salaryText (string|null — verbatim comp text if any)
- summary (string: 2-3 sentence plain-English overview of the role)
- requirements (string[]: hard must-have qualifications, each concise)
- niceToHaves (string[]: preferred / bonus qualifications)
- techStack (string[]: concrete languages, frameworks, tools, cloud services named)
- redFlags (string[]: things a candidate might find concerning — e.g. "unpaid take-home >5h", "on-call with no comp mentioned", "vague responsibilities", "wide salary band", "many required years for a 'junior' role"; empty array if none)
Be faithful to the text. Do not invent requirements that are not stated.`;

export async function extractJD(jdText: string): Promise<{
  data: ExtractedJD;
  model: string;
}> {
  const text = jdText.trim().slice(0, 12000);
  return chatJSON({
    system: SYSTEM,
    user: `Job description:\n\n"""\n${text}\n"""`,
    schema,
    maxTokens: 1800,
  });
}
