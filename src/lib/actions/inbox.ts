"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/viewer";
import { runInboxSync, type SyncResult } from "@/lib/inbox-sync";
import { ALL_STATUSES } from "@/lib/status";

export type { SyncResult };

export async function syncInbox(): Promise<SyncResult> {
  await requireViewer();
  let result: SyncResult;
  try {
    result = await runInboxSync();
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Inbox sync failed. Try again.",
    };
  }
  revalidatePath("/inbox");
  revalidatePath("/deadlines");
  revalidatePath("/");
  return result;
}

export async function linkThreadToApplication(formData: FormData) {
  await requireViewer();
  const threadId = String(formData.get("threadId"));
  const applicationId = String(formData.get("applicationId")) || null;
  await prisma.emailThread.update({
    where: { id: threadId },
    data: { applicationId },
  });
  revalidatePath(`/inbox/${threadId}`);
  revalidatePath("/inbox");
}

/** Create a new Application from an email thread and link the thread to it. */
export async function createApplicationFromThread(formData: FormData) {
  await requireViewer();
  const threadId = String(formData.get("threadId"));
  const companyName = String(formData.get("company") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "APPLIED");
  const status = (
    ALL_STATUSES.includes(statusRaw as ApplicationStatus) ? statusRaw : "APPLIED"
  ) as ApplicationStatus;

  if (!companyName || !role) return;

  const company = await prisma.company.upsert({
    where: { name: companyName },
    create: { name: companyName },
    update: {},
  });

  const app = await prisma.application.create({
    data: {
      companyId: company.id,
      role,
      status,
      source: "email",
      appliedAt: status !== "SAVED" ? new Date() : null,
      statusEvents: { create: { to: status } },
      emailThreads: { connect: { id: threadId } },
    },
  });

  revalidatePath("/inbox");
  revalidatePath("/applications");
  revalidatePath("/");
  redirect(`/applications/${app.id}`);
}

export async function clearThreadAction(formData: FormData) {
  await requireViewer();
  const threadId = String(formData.get("threadId"));
  await prisma.emailThread.update({
    where: { id: threadId },
    data: { actionNeeded: false },
  });
  revalidatePath("/inbox");
}
