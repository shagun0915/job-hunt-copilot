/**
 * Central place to read environment config and derive feature flags.
 * Every external integration degrades gracefully when its keys are absent,
 * so the app always boots — features just show a "not configured" state.
 */

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",

  authSecret: process.env.AUTH_SECRET ?? "",
  googleId: process.env.AUTH_GOOGLE_ID ?? "",
  googleSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
  allowedEmail: (process.env.ALLOWED_EMAIL ?? "").trim().toLowerCase(),

  // The `openai` npm SDK works against any OpenAI-compatible endpoint — set
  // OPENAI_BASE_URL to point it at a free provider (e.g. Gemini) instead of
  // OpenAI itself. Model names must match whatever OPENAI_BASE_URL expects.
  openaiKey: process.env.OPENAI_API_KEY ?? "",
  openaiBaseUrl: process.env.OPENAI_BASE_URL || undefined,
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  openaiEmbedModel: process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small",
  // Gemini's compat layer defaults reasoning models to a large hidden "thinking"
  // budget that eats the max_tokens budget before any JSON is emitted — default
  // to minimal reasoning for Gemini specifically. Only reasoning-capable models
  // accept this param at all, so it's opt-in elsewhere via OPENAI_REASONING_EFFORT.
  openaiReasoningEffort:
    process.env.OPENAI_REASONING_EFFORT ||
    (process.env.OPENAI_BASE_URL?.includes("generativelanguage.googleapis.com")
      ? "minimal"
      : undefined),

  gmailScope:
    process.env.GMAIL_SCOPE || "https://www.googleapis.com/auth/gmail.readonly",

  cronSecret: process.env.CRON_SECRET ?? "",
};

/** Google OAuth is wired up - enables real sign-in and Gmail sync. */
export const authConfigured = Boolean(env.googleId && env.googleSecret);

/** LLM features (JD extraction, resume match, email summaries) are available. */
export const aiConfigured = Boolean(env.openaiKey);

/**
 * A deployed instance must be gated by real auth. Without it, getViewer() would
 * hand every anonymous visitor a synthetic single user and expose every résumé,
 * email body and application - read and write. Vercel sets VERCEL_ENV on every
 * deployment (production, preview and its own "development"); local dev and CI
 * do not. Opt out only with an explicit ALLOW_LOCAL_MODE=1 (not recommended).
 */
const onDeployedHost = Boolean(process.env.VERCEL_ENV);
const allowLocalMode = process.env.ALLOW_LOCAL_MODE === "1";

/** True when this instance must not run without configured, restricted auth. */
export const enforceAuth = onDeployedHost && !allowLocalMode;

if (enforceAuth && !authConfigured) {
  throw new Error(
    "AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET are required on a deployed instance - " +
      "without them every route and server action is public. Set them, or set " +
      "ALLOW_LOCAL_MODE=1 to intentionally run ungated.",
  );
}
if (enforceAuth && authConfigured && !env.allowedEmail) {
  throw new Error(
    "ALLOWED_EMAIL is required on a deployed instance - a blank value lets any " +
      "Google account sign in and read/write everything. Set it to your address, " +
      "or set ALLOW_LOCAL_MODE=1 to allow every account.",
  );
}

/** When auth is not configured we run ungated in local single-user mode. */
export const localMode = !authConfigured;
