import { notFound } from "next/navigation";
import { db } from "@/lib/supabase";
import { renderBlocks, questionLabel } from "@/lib/render";
import type { PoolQuestion } from "@/lib/types";
import { Drill } from "./Drill";

export const revalidate = 3600;

export default async function TopicPage({ params }: { params: { slug: string } }) {
  const { data: topic } = await db().from("topics").select("id,slug,name").eq("slug", params.slug).eq("is_live", true).maybeSingle();
  if (!topic) notFound();

  // One query for the whole pool; the client shuffles and steps through it.
  const { data } = await db()
    .from("questions")
    .select("id, question_number, total_marks, content, memo, papers(year, session, paper_number)")
    .eq("topic_id", topic.id).eq("status", "verified");

  const pool: PoolQuestion[] = (data ?? []).map((q) => ({
    id: q.id,
    topic_id: topic.id,
    label: questionLabel(q.papers as unknown as { year: number; session: string; paper_number: number }, q.question_number),
    marks: q.total_marks,
    content: renderBlocks(q.content),
    memo: renderBlocks(q.memo),
  }));
  return <Drill topic={{ id: topic.id, name: topic.name }} pool={pool} />;
}
