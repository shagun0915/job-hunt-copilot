"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/viewer";
import { fetchBoard, type BoardSource } from "@/lib/jobs";

export type ImportResult = { error?: string; added?: number; total?: number };

export async function importBoard(
  _prev: ImportResult,
  formData: FormData,
): Promise<ImportResult> {
  await requireViewer();
  const source = String(formData.get("source")) as BoardSource;
  const token = String(formData.get("token") ?? "").trim();
  if (!token) return { error: "Enter the company's board token." };
  if (!["greenhouse", "lever", "ashby"].includes(source)) {
    return { error: "Unknown source." };
  }

  let listings;
  try {
    listings = await fetchBoard(source, token);
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? e.message
          : "Could not fetch that board — check the token.",
    };
  }

  // Dedupe within the payload and against what's already stored.
  const byUrl = new Map(listings.map((l) => [l.url, l]));
  const urls = [...byUrl.keys()];
  const existing = await prisma.jobListing.findMany({
    where: { url: { in: urls } },
    select: { url: true },
  });
  const known = new Set(existing.map((e) => e.url));
  const fresh = [...byUrl.values()].filter((l) => !known.has(l.url));

  if (fresh.length > 0) {
    await prisma.jobListing.createMany({
      data: fresh.map((l) => ({
        source: l.source,
        externalId: l.externalId,
        company: l.company,
        title: l.title,
        location: l.location,
        remote: l.remote,
        url: l.url,
        description: l.description,
        postedAt: l.postedAt,
        salaryText: l.salaryText,
      })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/jobs");
  return { added: fresh.length, total: listings.length };
}

export async function dismissListing(formData: FormData) {
  await requireViewer();
  const id = String(formData.get("id"));
  await prisma.jobListing.update({ where: { id }, data: { dismissed: true } });
  revalidatePath("/jobs");
}

export async function restoreListing(formData: FormData) {
  await requireViewer();
  const id = String(formData.get("id"));
  await prisma.jobListing.update({ where: { id }, data: { dismissed: false } });
  revalidatePath("/jobs");
}

/** Turn a listing into a tracked application (status SAVED). */
export async function trackListing(formData: FormData) {
  await requireViewer();
  const id = String(formData.get("id"));
  const listing = await prisma.jobListing.findUnique({ where: { id } });
  if (!listing) return;

  const company = await prisma.company.upsert({
    where: { name: listing.company },
    create: { name: listing.company },
    update: {},
  });

  const app = await prisma.application.create({
    data: {
      companyId: company.id,
      role: listing.title,
      location: listing.location,
      workArrangement: listing.remote ? "REMOTE" : null,
      source: listing.source,
      sourceUrl: listing.url,
      salaryNote: listing.salaryText,
      jdText: listing.description,
      status: "SAVED",
      statusEvents: { create: { to: "SAVED" } },
    },
  });

  await prisma.jobListing.update({
    where: { id },
    data: { savedAppId: app.id },
  });

  revalidatePath("/jobs");
  revalidatePath("/applications");
  redirect(`/applications/${app.id}`);
}
