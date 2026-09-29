import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { hasPlaceholder } from "@/lib/render";
import type { Block } from "@/lib/types";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { data, error } = await db().from("questions")
    .select("*, papers(id, year, session, paper_number, page_count, memo_page_count)")
    .eq("id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const b = await req.json();
  const patch: Record<string, unknown> = {};
  if (Array.isArray(b.content)) patch.content = b.content;
  if (Array.isArray(b.memo)) patch.memo = b.memo;
  if ("topic_id" in b) patch.topic_id = b.topic_id;
  if ("total_marks" in b) patch.total_marks = b.total_marks;
  if ("review_notes" in b) patch.review_notes = b.review_notes;
  if (["draft", "verified", "rejected"].includes(b.status)) patch.status = b.status;

  if (patch.status === "verified") {
    // Never let an unfinished question reach learners.
    const { data: cur } = await db().from("questions").select("content, memo, topic_id").eq("id", params.id).single();
    const content = (patch.content ?? cur?.content) as Block[];
    const memo = (patch.memo ?? cur?.memo) as Block[];
    const topic = "topic_id" in patch ? patch.topic_id : cur?.topic_id;
    if (!topic) return NextResponse.json({ error: "Choose a topic before verifying" }, { status: 422 });
    if (hasPlaceholder(content) || hasPlaceholder(memo))
      return NextResponse.json({ error: "Crop and attach every diagram before verifying" }, { status: 422 });
    if (!memo.length) return NextResponse.json({ error: "Memo is empty" }, { status: 422 });
  }
  const { error } = await db().from("questions").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
