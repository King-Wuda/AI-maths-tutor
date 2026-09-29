export type Block =
  | { type: "text"; value: string }
  | { type: "latex"; value: string; display?: boolean }
  | { type: "image"; path: string | null; alt?: string; page?: number; note?: string }
  | { type: "subq"; label: string; marks?: number; blocks: Block[] };

export type RenderedBlock =
  | { type: "html"; html: string; display?: boolean }
  | { type: "image"; src: string | null; alt: string }
  | { type: "subq"; label: string; marks?: number; blocks: RenderedBlock[] };

export type Topic = { id: number; slug: string; name: string; paper: 1 | 2; is_live: boolean };

export type PoolQuestion = {
  id: number;
  topic_id: number;
  label: string; // "Nov 2023 · P1 · Q4"
  marks: number | null;
  content: RenderedBlock[];
  memo: RenderedBlock[];
};

export const EVENT_TYPES = [
  "page_view", "topic_opened", "question_viewed", "memo_revealed",
  "self_mark", "exam_created", "exam_completed", "lead_submitted",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const MARKS = ["got", "partly", "missed"] as const;
export type Mark = (typeof MARKS)[number];
export const MARK_SCORE: Record<Mark, number> = { got: 1, partly: 0.5, missed: 0 };
