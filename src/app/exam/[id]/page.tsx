import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";
import { renderBlocks, questionLabel } from "@/lib/render";
import type { PoolQuestion } from "@/lib/types";
import { ExamView } from "./ExamView";

export const dynamic = "force-dynamic";

export default async function ExamPage({ params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const { data: exam } = await db().from("exams").select("id,paper_number,question_ids").eq("id", params.id).maybeSingle();
  if (!exam) notFound();

  const { data } = await db()
    .from("questions")
    .select("id, topic_id, question_number, total_marks, content, memo, papers(year, session, paper_number)")
    .in("id", exam.question_ids).eq("status", "verified");
  const byId = new Map((data ?? []).map((q) => [q.id, q]));
  const questions: PoolQuestion[] = (exam.question_ids as number[]).flatMap((id) => {
    const q = byId.get(id);
    if (!q) return [];
    return [{
      id: q.id, topic_id: q.topic_id, marks: q.total_marks,
      label: questionLabel(q.papers as unknown as { year: number; session: string; paper_number: number }, q.question_number),
      content: renderBlocks(q.content), memo: renderBlocks(q.memo),
    }];
  });
  return <ExamView examId={exam.id} paper={exam.paper_number} questions={questions} />;
}
