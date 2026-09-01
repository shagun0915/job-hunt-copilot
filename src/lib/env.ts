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

/** Google OAuth is wired up — enables real sign-in and Gmail sync. */
export const authConfigured = Boolean(env.googleId && env.googleSecret);

/** LLM features (JD extraction, resume match, email summaries) are available. */
export const aiConfigured = Boolean(env.openaiKey);

/** When auth is not configured we run ungated in local single-user mode. */
export const localMode = !authConfigured;
