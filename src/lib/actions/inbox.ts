"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/viewer";
import { runInboxSync, type SyncResult } from "@/lib/inbox-sync";

export type { SyncResult };

export async function syncInbox(): Promise<SyncResult> {
  await requireViewer();
  const result = await runInboxSync();
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

export async function clearThreadAction(formData: FormData) {
  await requireViewer();
  const threadId = String(formData.get("threadId"));
  await prisma.emailThread.update({
    where: { id: threadId },
    data: { actionNeeded: false },
  });
  revalidatePath("/inbox");
}
