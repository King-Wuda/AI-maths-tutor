import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";
import { anonId } from "@/lib/anon";
import { MARK_SCORE, type Mark } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Results({ params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const { data: exam } = await db().from("exams").select("question_ids").eq("id", params.id).maybeSingle();
  if (!exam) notFound();

  const anon = anonId();
  const [{ data: qs }, { data: evs }] = await Promise.all([
    db().from("questions").select("id,total_marks,topics(id,slug,name)").in("id", exam.question_ids),
    anon
      ? db().from("events").select("question_id,value,id").eq("exam_id", params.id).eq("anon_id", anon)
          .eq("event_type", "self_mark").order("id")
      : Promise.resolve({ data: [] as { question_id: number; value: string }[] }),
  ]);

  const latest = new Map<number, Mark>(); // last self-mark per question wins
  (evs ?? []).forEach((e) => latest.set(e.question_id, e.value as Mark));

  const rows = (qs ?? []).map((q) => {
    const t = q.topics as unknown as { slug: string; name: string };
    const marks = q.total_marks ?? 0;
    const m = latest.get(q.id);
    return { topic: t, marks, earned: m ? marks * MARK_SCORE[m] : 0, marked: !!m };
  });
  const totalMarks = rows.reduce((a, r) => a + r.marks, 0);
  const earned = rows.reduce((a, r) => a + r.earned, 0);
  const marked = rows.filter((r) => r.marked);
  const pct = (r: { earned: number; marks: number }) => (r.marks ? r.earned / r.marks : 0);
  const weakest = marked.length ? [...marked].sort((a, b) => pct(a) - pct(b))[0] : null;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Your results</h1>
      <div className="rounded-xl border bg-white p-5 text-center shadow-sm">
        <div className="text-4xl font-extrabold">{Math.round(earned)} / {totalMarks}</div>
        <div className="text-sm text-slate-500">Self-marked score ({marked.length} of {rows.length} questions marked)</div>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.topic.slug} className={`rounded-lg border bg-white p-3 ${weakest?.topic.slug === r.topic.slug ? "border-red-500 ring-1 ring-red-500" : ""}`}>
            <div className="flex justify-between text-sm">
              <span className="font-medium">{r.topic.name}{weakest?.topic.slug === r.topic.slug && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">Weakest</span>}</span>
              <span>{r.marked ? `${Math.round(pct(r) * 100)}%` : "not marked"}</span>
            </div>
            <div className="mt-2 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-blue-600" style={{ width: `${pct(r) * 100}%` }} /></div>
          </div>
        ))}
      </div>

      {weakest && (
        <Link href={`/topics/${weakest.topic.slug}`} className="block rounded-lg bg-blue-600 py-3 text-center font-semibold text-white">
          Practise {weakest.topic.name}
        </Link>
      )}
      <Link href="/exam/new" className="block text-center text-sm text-blue-700">Create another exam</Link>
    </div>
  );
}
