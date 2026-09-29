"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Blocks } from "@/components/Blocks";
import { SelfMark } from "@/components/SelfMark";
import { track } from "@/lib/client";
import type { Mark, PoolQuestion } from "@/lib/types";

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

export function Drill({ topic, pool }: { topic: { id: number; name: string }; pool: PoolQuestion[] }) {
  const [order, setOrder] = useState<PoolQuestion[] | null>(null);
  const [i, setI] = useState(0);
  const [memo, setMemo] = useState(false);
  const [mark, setMark] = useState<Mark>();

  useEffect(() => {
    // Unseen-first random order (seen ids kept locally); reshuffle once everything was seen.
    let seen: number[] = [];
    try { seen = JSON.parse(localStorage.getItem(`mt_seen_${topic.id}`) ?? "[]"); } catch {}
    const unseen = pool.filter((q) => !seen.includes(q.id));
    setOrder(unseen.length ? shuffle(unseen).concat(shuffle(pool.filter((q) => seen.includes(q.id)))) : shuffle(pool));
    track("topic_opened", { topic_id: topic.id });
  }, [pool, topic.id]);

  const q = order?.[i % (order?.length || 1)];

  useEffect(() => {
    if (!q) return;
    track("question_viewed", { topic_id: topic.id, question_id: q.id });
    try {
      const seen: number[] = JSON.parse(localStorage.getItem(`mt_seen_${topic.id}`) ?? "[]");
      if (!seen.includes(q.id)) localStorage.setItem(`mt_seen_${topic.id}`, JSON.stringify([...seen, q.id]));
    } catch {}
  }, [q, topic.id]);

  if (!order) return <p className="text-slate-500">Loading…</p>;
  if (!q) return <p>No verified questions for this topic yet.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <Link href="/topics" className="text-blue-700">← Topics</Link>
        <span className="text-slate-500">{topic.name}</span>
      </div>
      <article className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex justify-between text-xs text-slate-500">
          <span>{q.label}</span>{q.marks != null && <span>{q.marks} marks</span>}
        </div>
        <Blocks blocks={q.content} />
      </article>

      {!memo ? (
        <button onClick={() => { setMemo(true); track("memo_revealed", { topic_id: topic.id, question_id: q.id }); }}
          className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white">Show memo</button>
      ) : (
        <section className="space-y-3 rounded-xl border-2 border-green-600 bg-green-50 p-4">
          <h2 className="text-sm font-semibold text-green-800">Official memo</h2>
          <Blocks blocks={q.memo} />
        </section>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">How did you do?</p>
        <SelfMark value={mark} onChange={(m) => { setMark(m); track("self_mark", { topic_id: topic.id, question_id: q.id, value: m }); }} />
      </div>
      <button onClick={() => { setI(i + 1); setMemo(false); setMark(undefined); window.scrollTo(0, 0); }}
        className="w-full rounded-lg border-2 border-blue-600 py-3 font-semibold text-blue-700">Next question →</button>
    </div>
  );
}
