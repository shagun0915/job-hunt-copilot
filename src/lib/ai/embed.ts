import { openai } from "@/lib/openai";
import { env } from "@/lib/env";

/** Embed one or more strings. Returns one vector per input, order preserved. */
export async function embed(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];
  const res = await openai().embeddings.create({
    model: env.openaiEmbedModel,
    input: inputs.map((s) => s.slice(0, 8000)),
  });
  return res.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding as number[]);
}

export async function embedOne(input: string): Promise<number[]> {
  const [v] = await embed([input]);
  return v;
}

export function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
