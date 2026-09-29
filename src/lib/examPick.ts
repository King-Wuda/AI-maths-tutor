export type Candidate = { id: number; year: number };

/**
 * Pick one question from a topic's candidates. Prefer unseen questions, and
 * years not already used in this exam; fall back gracefully when none remain.
 */
export function pickQuestion(
  candidates: Candidate[],
  seen: Set<number>,
  usedYears: Set<number>,
  rand: () => number = Math.random,
): Candidate | null {
  if (!candidates.length) return null;
  const unseen = candidates.filter((c) => !seen.has(c.id));
  const pools = [
    unseen.filter((c) => !usedYears.has(c.year)),
    unseen,
    candidates.filter((c) => !usedYears.has(c.year)),
    candidates,
  ];
  const pool = pools.find((p) => p.length) as Candidate[];
  return pool[Math.floor(rand() * pool.length)];
}
