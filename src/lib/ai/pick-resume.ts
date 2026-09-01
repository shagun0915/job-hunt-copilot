import { z } from "zod";
import { chatJSON } from "@/lib/openai";

const schema = z.object({
  resumeIndex: z.number().int().min(0),
  reason: z.string(),
});

export type ResumeChoice = {
  id: string;
  label: string;
  kind: string;
  specialtyNote: string | null;
  preview: string;
};

/**
 * Pick the résumé version best suited to a JD — the specialized one when the
 * role narrowly matches its focus, the generic one otherwise. Mirrors the rule
 * the user set: decide automatically, but surface which was picked and why.
 */
export async function pickResume({
  jobTitle,
  company,
  jdText,
  requirements,
  options,
}: {
  jobTitle: string;
  company: string;
  jdText?: string | null;
  requirements?: string[];
  options: ResumeChoice[];
}): Promise<{ id: string; reason: string; model: string }> {
  if (options.length === 1) {
    return { id: options[0].id, reason: "Only one résumé version on file.", model: "heuristic" };
  }

  const jd =
    jdText?.trim().slice(0, 5000) ||
    (requirements?.length ? requirements.join("; ") : "(no JD text)");

  const list = options
    .map(
      (o, i) =>
        `[${i}] label="${o.label}" kind=${o.kind} specialty="${o.specialtyNote ?? "-"}"\n    preview: ${o.preview.slice(0, 400)}`,
    )
    .join("\n");

  const { data, model } = await chatJSON({
    system:
      "Pick the résumé version best matched to a job. Prefer a SPECIALIZED résumé only when the role narrowly fits its focus area; otherwise use the GENERIC one. Return ONLY JSON { resumeIndex: number, reason: string (one sentence) }.",
    user: `ROLE: ${jobTitle} at ${company}\n\nJD: ${jd}\n\nRÉSUMÉ VERSIONS:\n${list}`,
    schema,
    maxTokens: 300,
  });

  const chosen = options[data.resumeIndex] ?? options[0];
  return { id: chosen.id, reason: data.reason, model };
}
