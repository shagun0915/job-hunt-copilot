import OpenAI from "openai";
import { z } from "zod";
import { aiConfigured, env } from "@/lib/env";

export class AINotConfiguredError extends Error {
  constructor() {
    super("OPENAI_API_KEY is not set — AI features are disabled.");
    this.name = "AINotConfiguredError";
  }
}

let client: OpenAI | null = null;

/**
 * The `openai` SDK talks to any OpenAI-compatible endpoint, so this also
 * covers free providers (e.g. Gemini's compat layer) via OPENAI_BASE_URL —
 * see .env.example.
 */
export function openai(): OpenAI {
  if (!aiConfigured) throw new AINotConfiguredError();
  client ??= new OpenAI({ apiKey: env.openaiKey, baseURL: env.openaiBaseUrl });
  return client;
}

/** Map an LLM/network error to a short message safe to show the user. */
export function aiErrorMessage(e: unknown): string {
  if (e instanceof AINotConfiguredError) return e.message;
  const msg = e instanceof Error ? e.message : String(e);
  if (/429|rate.?limit|quota|RESOURCE_EXHAUSTED/i.test(msg))
    return "The AI provider is rate-limiting — wait a minute and try again.";
  if (/timeout|ETIMEDOUT|aborted|deadline/i.test(msg))
    return "The AI request timed out. Try again — a shorter JD/résumé helps.";
  if (/did not return valid JSON|Invalid|ZodError/i.test(msg))
    return "The model returned an unexpected response. Try again.";
  return "AI request failed. Try again in a moment.";
}

function stripCodeFence(s: string): string {
  const m = s.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1] : s;
}

/**
 * Ask the model for JSON and validate it against a Zod schema.
 * Requests response_format json_object where the endpoint honors it, and
 * always parses defensively (some OpenAI-compatible endpoints ignore that
 * param and wrap JSON in a ```json fence). Throws on invalid JSON or a
 * schema mismatch.
 */
export async function chatJSON<T>({
  system,
  user,
  schema,
  model = env.openaiModel,
  maxTokens = 1500,
}: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  model?: string;
  maxTokens?: number;
}): Promise<{ data: T; model: string }> {
  const messages = [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
  const reasoning_effort = env.openaiReasoningEffort as
    | OpenAI.Chat.ChatCompletionCreateParams["reasoning_effort"]
    | undefined;
  const base = {
    model,
    temperature: 0.2,
    max_tokens: maxTokens,
    ...(reasoning_effort ? { reasoning_effort } : {}),
    messages,
  } as const;

  const once = async () => {
    try {
      return await openai().chat.completions.create({
        ...base,
        response_format: { type: "json_object" },
      });
    } catch (e) {
      // Rate limits must bubble to the retry loop below.
      if (e instanceof OpenAI.APIError && e.status === 429) throw e;
      // Otherwise assume the endpoint rejected response_format — retry plain
      // and lean on the "return ONLY JSON" instruction + defensive parsing.
      return openai().chat.completions.create(base);
    }
  };

  // Free-tier providers (Gemini) 429 on a per-minute quota that clears fast —
  // a couple of backed-off retries smooth it over.
  let res;
  for (let attempt = 0; ; attempt++) {
    try {
      res = await once();
      break;
    } catch (e) {
      if (
        attempt < 2 &&
        e instanceof OpenAI.APIError &&
        e.status === 429
      ) {
        await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }

  const raw = stripCodeFence(res.choices[0]?.message?.content ?? "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Model did not return valid JSON: ${raw.slice(0, 200)}`);
  }
  return { data: schema.parse(parsed), model };
}
