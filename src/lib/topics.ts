/** Usual paper order of topics, used to order exam questions. */
export const PAPER_TOPIC_ORDER: Record<1 | 2, string[]> = {
  1: ["algebra", "sequences-series", "functions-and-graphs", "finance", "differential-calculus", "probability"],
  2: ["statistics", "analytical-geometry", "trigonometry", "euclidean-geometry"],
};

export function topicRank(paper: number, slug: string): number {
  const i = PAPER_TOPIC_ORDER[paper as 1 | 2]?.indexOf(slug) ?? -1;
  return i === -1 ? 999 : i;
}
