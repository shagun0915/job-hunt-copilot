"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/viewer";
import { PROFILE_ID } from "@/lib/profile";

export type ProfileState = { ok?: boolean; error?: string };

export async function saveProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  await requireViewer();

  const str = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const doNotClaim = String(formData.get("doNotClaim") ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const data = {
    fullName: str("fullName"),
    headline: str("headline"),
    location: str("location"),
    availability: str("availability"),
    statusNote: str("statusNote"),
    doNotClaim,
  };

  await prisma.candidateProfile.upsert({
    where: { id: PROFILE_ID },
    create: { id: PROFILE_ID, ...data },
    update: data,
  });

  revalidatePath("/profile");
  return { ok: true };
}
