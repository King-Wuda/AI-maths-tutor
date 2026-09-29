import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { anonId } from "@/lib/anon";
import { EVENT_TYPES } from "@/lib/types";

const num = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : null);
const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(req: Request) {
  const anon = anonId();
  const body = await req.json().catch(() => null);
  if (!anon || !body || !EVENT_TYPES.includes(body.event_type)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await db().from("events").insert({
    anon_id: anon,
    event_type: body.event_type,
    topic_id: num(body.topic_id),
    question_id: num(body.question_id),
    exam_id: typeof body.exam_id === "string" && UUID.test(body.exam_id) ? body.exam_id : null,
    value: typeof body.value === "string" ? body.value.slice(0, 100) : null,
  });
  return NextResponse.json({ ok: true });
}
