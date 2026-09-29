import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { db } from "@/lib/supabase";

/** List of all questions (light) + topics + progress counters for the review screen. */
export async function GET() {
  const [{ data: qs }, { data: topics }] = await Promise.all([
    db().from("questions").select("id, question_number, topic_id, status, paper_id, papers(year, session, paper_number)").order("paper_id").order("id"),
    db().from("topics").select("id, slug, name, paper, is_live").order("id"),
  ]);
  return NextResponse.json({ questions: qs ?? [], topics: topics ?? [] });
}
