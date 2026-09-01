import { prisma } from "@/lib/prisma";

export const PROFILE_ID = "singleton";

export type CandidateProfile = Awaited<ReturnType<typeof getProfile>>;

export async function getProfile() {
  return prisma.candidateProfile.findUnique({ where: { id: PROFILE_ID } });
}

/**
 * Format the profile as a block of accuracy constraints for LLM prompts —
 * keeps drafts and résumé rewrites factually correct (employment status,
 * availability, claims never to make).
 */
export function profileFacts(
  p: Awaited<ReturnType<typeof getProfile>>,
): string {
  if (!p) return "";
  const lines: string[] = [];
  if (p.fullName) lines.push(`Name: ${p.fullName}`);
  if (p.headline) lines.push(`Headline: ${p.headline}`);
  if (p.location) lines.push(`Location: ${p.location}`);
  if (p.availability) lines.push(`Availability: ${p.availability}`);
  if (p.statusNote) lines.push(`Employment status: ${p.statusNote}`);
  if (p.doNotClaim.length)
    lines.push(
      `NEVER claim these skills/tools/experience (not on the résumé): ${p.doNotClaim.join(", ")}`,
    );
  if (!lines.length) return "";
  return `CANDIDATE FACTS (must stay accurate — do not contradict):\n${lines
    .map((l) => `- ${l}`)
    .join("\n")}`;
}
