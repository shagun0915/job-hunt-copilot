"use server";

import { revalidatePath } from "next/cache";
import type { ResumeKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/viewer";
import { extractResumeText } from "@/lib/resume-parse";
import { matchResume } from "@/lib/ai/match-resume";
import { pickResume } from "@/lib/ai/pick-resume";
import { aiErrorMessage } from "@/lib/openai";
import { getProfile, profileFacts } from "@/lib/profile";

const KINDS: ResumeKind[] = ["SPECIALIZED", "GENERIC", "OTHER"];

export async function createResumeVersion(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  await requireViewer();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "Give this version a label." };

  const kindRaw = String(formData.get("kind") ?? "OTHER") as ResumeKind;
  const kind = KINDS.includes(kindRaw) ? kindRaw : "OTHER";
  const specialtyNote = String(formData.get("specialtyNote") ?? "").trim() || null;

  const file = formData.get("file");
  const pastedText = String(formData.get("content") ?? "").trim();

  let content = pastedText;
  let fileName: string | null = null;
  let mimeType: string | null = null;

  if (file instanceof File && file.size > 0) {
    fileName = file.name;
    mimeType = file.type || null;
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      content = await extractResumeText(buf, file.type, file.name);
    } catch (e) {
      return {
        error:
          e instanceof Error
            ? `Could not read that file: ${e.message}`
            : "Could not read that file.",
      };
    }
  }

  if (content.trim().length < 50) {
    return { error: "Résumé text looks too short — upload a file or paste the text." };
  }

  const isFirst = (await prisma.resumeVersion.count()) === 0;

  await prisma.resumeVersion.create({
    data: {
      label,
      kind,
      specialtyNote,
      fileName,
      mimeType,
      content: content.trim(),
      isDefault: isFirst,
    },
  });

  revalidatePath("/resumes");
  return { ok: true };
}

export async function setDefaultResume(formData: FormData) {
  await requireViewer();
  const id = String(formData.get("id"));
  await prisma.$transaction([
    prisma.resumeVersion.updateMany({ data: { isDefault: false } }),
    prisma.resumeVersion.update({ where: { id }, data: { isDefault: true } }),
  ]);
  revalidatePath("/resumes");
}

export async function updateResumeMeta(formData: FormData) {
  await requireViewer();
  const id = String(formData.get("id"));
  const kindRaw = String(formData.get("kind") ?? "OTHER") as ResumeKind;
  await prisma.resumeVersion.update({
    where: { id },
    data: {
      label: String(formData.get("label") ?? "").trim() || undefined,
      kind: KINDS.includes(kindRaw) ? kindRaw : "OTHER",
      specialtyNote: String(formData.get("specialtyNote") ?? "").trim() || null,
    },
  });
  revalidatePath("/resumes");
}

export async function deleteResumeVersion(formData: FormData) {
  await requireViewer();
  const id = String(formData.get("id"));
  await prisma.resumeVersion.delete({ where: { id } });
  revalidatePath("/resumes");
}

/**
 * Run the ATS pipeline: pick the résumé version (unless one is chosen), score
 * before/after, split the keyword gap into hard vs nice-to-have, produce
 * truthful rewrites, and list gaps that can't be honestly closed.
 */
export async function runResumeMatch(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  await requireViewer();
  const applicationId = String(formData.get("applicationId"));
  let resumeVersionId = String(formData.get("resumeVersionId") ?? "");

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { company: true },
  });
  if (!app) return { error: "Application not found." };

  const resumes = await prisma.resumeVersion.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  if (resumes.length === 0) {
    return { error: "Add a résumé on the Résumés page first." };
  }

  let autoPicked = false;
  let pickReason: string | null = null;

  if (!resumeVersionId || resumeVersionId === "auto") {
    autoPicked = true;
    try {
      const choice = await pickResume({
        jobTitle: app.role,
        company: app.company.name,
        jdText: app.jdText,
        requirements: app.jdRequirements,
        options: resumes.map((r) => ({
          id: r.id,
          label: r.label,
          kind: r.kind,
          specialtyNote: r.specialtyNote,
          preview: r.content.slice(0, 600),
        })),
      });
      resumeVersionId = choice.id;
      pickReason = choice.reason;
    } catch {
      resumeVersionId = resumes.find((r) => r.isDefault)?.id ?? resumes[0].id;
      pickReason = "Fell back to the default résumé (auto-pick unavailable).";
    }
  }

  const resume = resumes.find((r) => r.id === resumeVersionId);
  if (!resume) return { error: "Résumé version not found." };

  try {
    const profile = await getProfile();
    const { data, model } = await matchResume({
      resumeText: resume.content,
      resumeLabel: resume.label,
      jobTitle: app.role,
      company: app.company.name,
      jdText: app.jdText,
      requirements: app.jdRequirements,
      candidateFacts: profileFacts(profile),
    });

    const payload = {
      scoreBefore: Math.round(data.scoreBefore),
      scoreAfter: Math.round(data.scoreAfter),
      scoreRationale: data.scoreRationale,
      titleAlignment: data.titleAlignment,
      autoPicked,
      pickReason,
      matched: data.matched,
      hardRequirementsGaps: data.hardRequirementsGaps,
      niceToHaveGaps: data.niceToHaveGaps,
      formattingFlags: data.formattingFlags,
      uncloseableGaps: data.uncloseableGaps,
      rewrites: data.rewrites as unknown as Prisma.InputJsonValue,
      verdict: data.verdict,
      model,
    };

    await prisma.matchScore.upsert({
      where: {
        applicationId_resumeVersionId: { applicationId, resumeVersionId },
      },
      create: { applicationId, resumeVersionId, ...payload },
      update: payload,
    });
  } catch (e) {
    return { error: aiErrorMessage(e) };
  }

  revalidatePath(`/applications/${applicationId}`);
  return { ok: true };
}
