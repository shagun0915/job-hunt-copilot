"use server";

import { revalidatePath } from "next/cache";
import type {
  ContactRole,
  DeadlineType,
  InterviewType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/viewer";

export async function addContact(formData: FormData) {
  await requireViewer();
  const applicationId = String(formData.get("applicationId"));
  await prisma.contact.create({
    data: {
      applicationId,
      name: String(formData.get("name")).trim(),
      role: (String(formData.get("role")) || "OTHER") as ContactRole,
      email: String(formData.get("email") ?? "") || null,
      linkedinUrl: String(formData.get("linkedinUrl") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
    },
  });
  revalidatePath(`/applications/${applicationId}`);
}

export async function deleteContact(formData: FormData) {
  await requireViewer();
  const id = String(formData.get("id"));
  const applicationId = String(formData.get("applicationId"));
  await prisma.contact.delete({ where: { id } });
  revalidatePath(`/applications/${applicationId}`);
}

export async function addDeadline(formData: FormData) {
  await requireViewer();
  const applicationId = String(formData.get("applicationId")) || null;
  const dueAt = new Date(String(formData.get("dueAt")));
  if (Number.isNaN(dueAt.getTime())) return;

  await prisma.deadline.create({
    data: {
      applicationId,
      title: String(formData.get("title")).trim(),
      type: (String(formData.get("type")) || "OTHER") as DeadlineType,
      dueAt,
      notes: String(formData.get("notes") ?? "") || null,
      source: "manual",
    },
  });
  if (applicationId) revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/deadlines");
  revalidatePath("/");
}

export async function toggleDeadline(formData: FormData) {
  await requireViewer();
  const id = String(formData.get("id"));
  const d = await prisma.deadline.findUnique({
    where: { id },
    select: { completedAt: true, applicationId: true },
  });
  if (!d) return;
  await prisma.deadline.update({
    where: { id },
    data: { completedAt: d.completedAt ? null : new Date() },
  });
  if (d.applicationId) revalidatePath(`/applications/${d.applicationId}`);
  revalidatePath("/deadlines");
  revalidatePath("/");
}

export async function deleteDeadline(formData: FormData) {
  await requireViewer();
  const id = String(formData.get("id"));
  const d = await prisma.deadline.findUnique({
    where: { id },
    select: { applicationId: true },
  });
  await prisma.deadline.delete({ where: { id } });
  if (d?.applicationId) revalidatePath(`/applications/${d.applicationId}`);
  revalidatePath("/deadlines");
  revalidatePath("/");
}

export async function addInterview(formData: FormData) {
  await requireViewer();
  const applicationId = String(formData.get("applicationId"));
  const scheduledRaw = String(formData.get("scheduledAt") ?? "");
  const scheduledAt = scheduledRaw ? new Date(scheduledRaw) : null;

  await prisma.interview.create({
    data: {
      applicationId,
      type: (String(formData.get("type")) || "OTHER") as InterviewType,
      scheduledAt:
        scheduledAt && !Number.isNaN(scheduledAt.getTime()) ? scheduledAt : null,
      location: String(formData.get("location") ?? "") || null,
      withNames: String(formData.get("withNames") ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      prepNotes: String(formData.get("prepNotes") ?? "") || null,
    },
  });
  revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/");
}

export async function updateInterviewOutcome(formData: FormData) {
  await requireViewer();
  const id = String(formData.get("id"));
  const applicationId = String(formData.get("applicationId"));
  await prisma.interview.update({
    where: { id },
    data: {
      outcome: String(formData.get("outcome") ?? "") || null,
      debrief: String(formData.get("debrief") ?? "") || null,
    },
  });
  revalidatePath(`/applications/${applicationId}`);
}

export async function deleteInterview(formData: FormData) {
  await requireViewer();
  const id = String(formData.get("id"));
  const applicationId = String(formData.get("applicationId"));
  await prisma.interview.delete({ where: { id } });
  revalidatePath(`/applications/${applicationId}`);
}
