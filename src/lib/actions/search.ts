"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/lib/viewer";
import { reindex, type IndexResult } from "@/lib/search";

export type ReindexState = { error?: string; result?: IndexResult };

export async function reindexAction(
  _prev: ReindexState,
  _formData: FormData,
): Promise<ReindexState> {
  await requireViewer();
  try {
    const result = await reindex();
    revalidatePath("/search");
    return { result };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Re-index failed.",
    };
  }
}
