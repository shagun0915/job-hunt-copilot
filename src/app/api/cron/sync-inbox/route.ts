import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { env, authConfigured } from "@/lib/env";
import { runInboxSync } from "@/lib/inbox-sync";

// Vercel Hobby caps function duration at 60s; sync a smaller batch on a schedule
// and let the manual "Sync inbox" button handle the full 25.
export const maxDuration = 60;
const CRON_BATCH = 10;

/**
 * Scheduled inbox sync. Wired up in vercel.json; Vercel Cron sends
 * `Authorization: Bearer $CRON_SECRET`. Also runnable by hand with the same header.
 */
export async function GET(request: Request) {
  if (!env.cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 503 },
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!authConfigured) {
    return NextResponse.json(
      { error: "Google OAuth is not configured — nothing to sync." },
      { status: 503 },
    );
  }

  const result = await runInboxSync(CRON_BATCH);
  revalidatePath("/inbox");
  revalidatePath("/deadlines");
  revalidatePath("/");

  return NextResponse.json({ ok: !result.error, ...result });
}
