import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { anonId } from "@/lib/anon";

const ROLES = ["learner", "parent", "teacher"];

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().slice(0, 200);
  const whatsapp = String(body?.whatsapp ?? "").trim().slice(0, 30);
  const role = ROLES.includes(body?.role) ? body.role : "learner";
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  const waOk = /^\+?[0-9 ]{9,15}$/.test(whatsapp);
  if (!emailOk && !waOk) {
    return NextResponse.json({ error: "Enter a valid email or WhatsApp number" }, { status: 400 });
  }
  const anon = anonId();
  await db().from("leads").insert({
    anon_id: anon, email: emailOk ? email : null, whatsapp: waOk ? whatsapp : null, role,
  });
  if (anon) await db().from("events").insert({ anon_id: anon, event_type: "lead_submitted", value: role });
  return NextResponse.json({ ok: true });
}
