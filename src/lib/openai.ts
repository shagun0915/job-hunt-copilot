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

  let res;
  try {
    res = await openai().chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      ...(reasoning_effort ? { reasoning_effort } : {}),
      messages,
    });
  } catch {
    // Some OpenAI-compatible endpoints (e.g. free-tier proxies) reject the
    // response_format param outright — retry without it and lean on the
    // system prompt + defensive parsing below.
    res = await openai().chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: maxTokens,
      ...(reasoning_effort ? { reasoning_effort } : {}),
      messages,
    });
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
