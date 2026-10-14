export type RoleCandidate = { id: string; role: string };

/**
 * Among several applications at the same company, pick the one an email
 * thread is about by comparing role text — word overlap between the
 * candidate's `role` and the thread's guessed role + subject.
 *
 * Returns null when there isn't a clear winner (no shared words, or a tie)
 * rather than guessing — two near-duplicate titles at the same company
 * ("Security/Privacy" vs "Security/Privacy, gTech Risk") are genuinely
 * ambiguous from title text alone, and a wrong auto-link is worse than an
 * unlinked thread the user resolves by hand.
 */
export function disambiguateByRole(
  candidates: RoleCandidate[],
  signalText: string,
): string | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0].id;

  const signal = tokenize(signalText);
  if (signal.size === 0) return null;

  const scored = candidates
    .map((c) => ({ id: c.id, score: overlapCount(tokenize(c.role), signal) }))
    .sort((a, b) => b.score - a.score);

  const [best, runnerUp] = scored;
  if (best.score > 0 && best.score > (runnerUp?.score ?? 0)) return best.id;
  return null;
}

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

function overlapCount(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n;
}
