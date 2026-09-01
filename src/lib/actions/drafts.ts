"use server";

import { revalidatePath } from "next/cache";
import type { DraftKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/viewer";
import { aiConfigured } from "@/lib/env";
import { draftMessage } from "@/lib/ai/draft-message";
import { getProfile, profileFacts } from "@/lib/profile";

const KINDS: DraftKind[] = [
  "COVER_LETTER",
  "RECRUITER_REPLY",
  "REFERRAL_ASK",
  "COLD_OUTREACH",
  "APPLICATION_EMAIL",
  "FOLLOW_UP",
];

export type DraftState = { error?: string; ok?: boolean };

export async function generateDraft(
  _prev: DraftState,
  formData: FormData,
): Promise<DraftState> {
  await requireViewer();
  if (!aiConfigured) return { error: "Set OPENAI_API_KEY to generate drafts." };

  const applicationId = String(formData.get("applicationId"));
  const kind = String(formData.get("kind")) as DraftKind;
  const instructions = String(formData.get("instructions") ?? "").trim() || null;
  const recipientContext =
    String(formData.get("recipientContext") ?? "").trim() || null;
  if (!KINDS.includes(kind)) return { error: "Unknown draft type." };

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      company: true,
      contacts: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!app) return { error: "Application not found." };

  const resume =
    (await prisma.resumeVersion.findFirst({ where: { isDefault: true } })) ??
    (await prisma.resumeVersion.findFirst({ orderBy: { createdAt: "desc" } }));

  const contact =
    app.contacts.find((c) => c.role === "RECRUITER" || c.role === "REFERRAL") ??
    app.contacts[0];

  const profile = await getProfile();

  try {
    const { data, model } = await draftMessage({
      kind,
      role: app.role,
      company: app.company.name,
      jdText: app.jdText,
      requirements: app.jdRequirements,
      resumeText: resume?.content,
      instructions,
      contactName: contact?.name ?? null,
      recipientContext,
      candidateFacts: profileFacts(profile),
    });

    await prisma.draft.create({
      data: {
        applicationId,
        kind,
        subject: data.subject ?? null,
        shortNote: data.shortNote ?? null,
        body: data.body,
        instructions,
        recipientContext,
        resumeVersionId: resume?.id ?? null,
        model,
      },
    });
  } catch (e) {
    return {
      error:
        e instanceof Error ? e.message : "Draft generation failed. Try again.",
    };
  }

  revalidatePath(`/applications/${applicationId}`);
  return { ok: true };
}

export async function deleteDraft(formData: FormData) {
  await requireViewer();
  const id = String(formData.get("id"));
  const d = await prisma.draft.findUnique({
    where: { id },
    select: { applicationId: true },
  });
  await prisma.draft.delete({ where: { id } });
  if (d) revalidatePath(`/applications/${d.applicationId}`);
}
