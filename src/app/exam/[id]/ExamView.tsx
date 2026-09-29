"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Blocks } from "@/components/Blocks";
import { SelfMark } from "@/components/SelfMark";
import { track } from "@/lib/client";
import type { Mark, PoolQuestion } from "@/lib/types";

const fmt = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function ExamView({ examId, paper, questions }: { examId: string; paper: number; questions: PoolQuestion[] }) {
  const router = useRouter();
  const total = questions.reduce((a, q) => a + (q.marks ?? 0), 0);
  const [memos, setMemos] = useState<Set<number>>(new Set());
  const [marks, setMarks] = useState<Record<number, Mark>>({});
  const [left, setLeft] = useState<number | null>(null); // seconds; null = timer off

  useEffect(() => {
    questions.forEach((q) => track("question_viewed", { topic_id: q.topic_id, question_id: q.id, exam_id: examId }));
  }, [questions, examId]);

  useEffect(() => {
    if (left === null || left <= 0) return;
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const done = Object.keys(marks).length;
  const finish = () => { track("exam_completed", { exam_id: examId }); router.push(`/exam/${examId}/results`); };

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between border-b bg-white/95 px-4 py-2 text-sm backdrop-blur">
        <span className="font-semibold">Paper {paper} · {total} marks</span>
        {left === null ? (
          <button className="text-blue-700" onClick={() => setLeft(Math.round(total * 1.2 * 60))}>Start timer ({Math.round(total * 1.2)} min)</button>
        ) : (
          <span className={left <= 0 ? "font-bold text-red-600" : "tabular-nums"}>{left <= 0 ? "Time's up" : fmt(left)}</span>
        )}
      </div>

      {questions.map((q, n) => (
        <section key={q.id} className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Question {n + 1} · {q.label}</span>{q.marks != null && <span>{q.marks} marks</span>}
          </div>
          <Blocks blocks={q.content} />
          {!memos.has(q.id) ? (
            <button className="w-full rounded-lg border-2 border-blue-600 py-2 font-medium text-blue-700"
              onClick={() => { setMemos(new Set(memos).add(q.id)); track("memo_revealed", { topic_id: q.topic_id, question_id: q.id, exam_id: examId }); }}>
              Show memo
            </button>
          ) : (
            <div className="space-y-3 rounded-lg border-2 border-green-600 bg-green-50 p-3">
              <h3 className="text-sm font-semibold text-green-800">Official memo</h3>
              <Blocks blocks={q.memo} />
            </div>
          )}
          <SelfMark value={marks[q.id]} onChange={(m) => { setMarks({ ...marks, [q.id]: m }); track("self_mark", { topic_id: q.topic_id, question_id: q.id, exam_id: examId, value: m }); }} />
        </section>
      ))}

      <button onClick={finish} className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white">
        Finish &amp; see results ({done}/{questions.length} marked)
      </button>
    </div>
  );
}
