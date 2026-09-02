"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/viewer";
import { extractJD } from "@/lib/ai/extract-jd";
import { aiErrorMessage } from "@/lib/openai";
import { ALL_STATUSES } from "@/lib/status";

async function upsertCompany(name: string) {
  const clean = name.trim();
  return prisma.company.upsert({
    where: { name: clean },
    create: { name: clean },
    update: {},
  });
}

/** Form number field: "" / missing / junk → undefined, otherwise a positive int. */
const optionalPositiveInt = z.preprocess((raw) => {
  if (raw === "" || raw == null) return undefined;
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}, z.number().int().positive().optional());

const createSchema = z.object({
  company: z.string().min(1, "Company is required"),
  role: z.string().min(1, "Role is required"),
  status: z.enum(ALL_STATUSES as [string, ...string[]]).default("SAVED"),
  location: z.string().optional(),
  seniority: z.string().optional(),
  source: z.string().optional(),
  sourceUrl: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  salaryMin: optionalPositiveInt,
  salaryMax: optionalPositiveInt,
  notes: z.string().optional(),
  jdText: z.string().optional(),
  autoExtract: z.union([z.literal("on"), z.literal("")]).optional(),
});

export type ActionState = { error?: string; ok?: boolean };

export async function createApplication(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireViewer();

  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const status = v.status as ApplicationStatus;

  const company = await upsertCompany(v.company);

  const app = await prisma.application.create({
    data: {
      companyId: company.id,
      role: v.role.trim(),
      status,
      location: v.location || null,
      seniority: v.seniority || null,
      source: v.source || null,
      sourceUrl: v.sourceUrl ?? null,
      salaryMin: v.salaryMin ?? null,
      salaryMax: v.salaryMax ?? null,
      notes: v.notes || null,
      jdText: v.jdText?.trim() || null,
      appliedAt:
        status !== "SAVED" ? new Date() : null,
      statusEvents: { create: { to: status } },
    },
  });

  if (v.autoExtract === "on" && v.jdText && v.jdText.trim().length > 40) {
    try {
      await runExtractJD(app.id);
    } catch {
      // extraction is best-effort; the application is already saved
    }
  }

  revalidatePath("/applications");
  revalidatePath("/");
  redirect(`/applications/${app.id}`);
}

const updateSchema = z.object({
  id: z.string().min(1),
  role: z.string().min(1).optional(),
  seniority: z.string().optional(),
  location: z.string().optional(),
  source: z.string().optional(),
  sourceUrl: z.string().optional(),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
  salaryNote: z.string().optional(),
  notes: z.string().optional(),
  jdText: z.string().optional(),
});

export async function updateApplication(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireViewer();
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const toInt = (s?: string) => {
    const n = Number.parseInt(s ?? "", 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  await prisma.application.update({
    where: { id: v.id },
    data: {
      role: v.role?.trim(),
      seniority: v.seniority || null,
      location: v.location || null,
      source: v.source || null,
      sourceUrl: v.sourceUrl || null,
      salaryMin: toInt(v.salaryMin),
      salaryMax: toInt(v.salaryMax),
      salaryNote: v.salaryNote || null,
      notes: v.notes || null,
      jdText: v.jdText?.trim() || null,
    },
  });

  revalidatePath(`/applications/${v.id}`);
  return { ok: true };
}

export async function setStatus(formData: FormData) {
  await requireViewer();
  const id = String(formData.get("id"));
  const to = String(formData.get("status")) as ApplicationStatus;
  const note = String(formData.get("note") ?? "") || null;

  const current = await prisma.application.findUnique({
    where: { id },
    select: { status: true, appliedAt: true },
  });
  if (!current) return;

  await prisma.application.update({
    where: { id },
    data: {
      status: to,
      appliedAt:
        current.appliedAt ?? (to !== "SAVED" ? new Date() : null),
      statusEvents: { create: { from: current.status, to, note } },
    },
  });

  revalidatePath(`/applications/${id}`);
  revalidatePath("/applications");
  revalidatePath("/");
}

export async function deleteApplication(formData: FormData) {
  await requireViewer();
  const id = String(formData.get("id"));
  await prisma.application.delete({ where: { id } });
  revalidatePath("/applications");
  revalidatePath("/");
  redirect("/applications");
}

/** Run LLM extraction over an application's stored JD text and persist results. */
export async function runExtractJD(applicationId: string): Promise<ActionState> {
  await requireViewer();
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, jdText: true, companyId: true },
  });
  if (!app?.jdText || app.jdText.trim().length < 40) {
    return { error: "Add a job description first (at least a paragraph)." };
  }

  try {
    const { data, model } = await extractJD(app.jdText);
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        jdSummary: data.summary,
        jdRequirements: data.requirements,
        jdNiceToHaves: data.niceToHaves,
        jdTechStack: data.techStack,
        jdRedFlags: data.redFlags,
        jdExtractedAt: new Date(),
        jdExtractModel: model,
        seniority: data.seniority || undefined,
        location: data.location || undefined,
        remote: data.remote ?? undefined,
        salaryNote: data.salaryText || undefined,
      },
    });
  } catch (e) {
    return { error: aiErrorMessage(e) };
  }

  revalidatePath(`/applications/${applicationId}`);
  return { ok: true };
}

export async function extractJDAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runExtractJD(String(formData.get("id")));
}
