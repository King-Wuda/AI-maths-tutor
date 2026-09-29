import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { anonId } from "@/lib/anon";
import { topicRank } from "@/lib/topics";
import { pickQuestion, type Candidate } from "@/lib/examPick";

export async function POST(req: Request) {
  const anon = anonId();
  const body = await req.json().catch(() => null);
  const paper = body?.paper;
  if (!anon || (paper !== 1 && paper !== 2)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const wanted: string[] | null = Array.isArray(body.topics) && body.topics.length ? body.topics : null;

  const { data: topics } = await db().from("topics").select("id,slug").eq("paper", paper).eq("is_live", true);
  const chosen = (topics ?? []).filter((t) => !wanted || wanted.includes(t.slug));
  if (!chosen.length) return NextResponse.json({ error: "No live topics for that selection" }, { status: 404 });

  const { data: qs } = await db()
    .from("questions")
    .select("id, topic_id, papers(year)")
    .eq("status", "verified")
    .in("topic_id", chosen.map((t) => t.id));

  const [{ data: seenEv }, { data: seenExams }] = await Promise.all([
    db().from("events").select("question_id").eq("anon_id", anon).eq("event_type", "question_viewed").not("question_id", "is", null),
    db().from("exams").select("question_ids").eq("anon_id", anon),
  ]);
  const seen = new Set<number>([
    ...(seenEv ?? []).map((e) => e.question_id as number),
    ...(seenExams ?? []).flatMap((e) => e.question_ids as number[]),
  ]);

  const byTopic = new Map<number, Candidate[]>();
  for (const q of qs ?? []) {
    const year = (q.papers as unknown as { year: number } | null)?.year ?? 0;
    byTopic.set(q.topic_id, [...(byTopic.get(q.topic_id) ?? []), { id: q.id, year }]);
  }

  const ordered = [...chosen].sort((a, b) => topicRank(paper, a.slug) - topicRank(paper, b.slug));
  const usedYears = new Set<number>();
  const ids: number[] = [];
  for (const t of ordered) {
    const pick = pickQuestion(byTopic.get(t.id) ?? [], seen, usedYears);
    if (pick) { ids.push(pick.id); usedYears.add(pick.year); }
  }
  if (!ids.length) return NextResponse.json({ error: "No verified questions yet" }, { status: 404 });

  const { data: exam, error } = await db()
    .from("exams").insert({ anon_id: anon, paper_number: paper, question_ids: ids }).select("id").single();
  if (error || !exam) return NextResponse.json({ error: "Could not create exam" }, { status: 500 });
  await db().from("events").insert({ anon_id: anon, event_type: "exam_created", exam_id: exam.id, value: `P${paper}` });
  return NextResponse.json({ id: exam.id });
}
