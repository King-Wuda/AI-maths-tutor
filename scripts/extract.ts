/**
 * Admin extraction pipeline.
 *   npm run extract -- --year 2023 --session November --paper 1 --pdf ./p1.pdf --memo ./p1-memo.pdf
 * Needs: pdftoppm (poppler-utils), NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY.
 * Everything is inserted as status='draft'; nothing reaches learners until verified in /admin/review.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : undefined; };
const year = Number(arg("year")), session = arg("session"), paper = Number(arg("paper"));
const pdf = arg("pdf"), memoPdf = arg("memo");
if (!year || !session || ![1, 2].includes(paper) || !pdf || !memoPdf) {
  console.error("Usage: --year 2023 --session November --paper 1 --pdf file.pdf --memo memo.pdf");
  process.exit(1);
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const ai = new Anthropic();
const MODEL = process.env.EXTRACT_MODEL ?? "claude-opus-5-5";

const TOPICS: Record<number, string[]> = {
  1: ["algebra", "sequences-series", "functions-and-graphs", "finance", "differential-calculus", "probability"],
  2: ["statistics", "analytical-geometry", "trigonometry", "euclidean-geometry"],
};

const SCHEMA = `Block format (JSON):
  { "type": "text", "value": "plain text; inline maths inside $...$ (LaTeX)" }
  { "type": "latex", "value": "LaTeX without delimiters", "display": true }
  { "type": "image", "path": null, "page": <page number>, "note": "what the graph/diagram shows" }
  { "type": "subq", "label": "4.1.1", "marks": 2, "blocks": [ ...nested blocks... ] }`;

function prompt(kind: "question" | "memo") {
  const shared = `You are transcribing a South African DBE Grade 12 Mathematics ${kind === "question" ? "question paper" : "marking memorandum"}.
Return JSON ONLY (no prose, no code fences): an array with ONE object per MAIN question (Question 1, 2, 3 ...).
Transcribe EXACTLY. Never fix, simplify or "improve" anything: copy every sign, exponent and number as printed.
Use LaTeX for ALL mathematical notation. Nest sub-questions (4.1, 4.1.1) as "subq" blocks; a main question keeps all its sub-parts and shared text.
For every graph, diagram or figure emit an image placeholder block exactly as specified (path null) with the page number where it appears; do not describe it in text.
${SCHEMA}
Pages are provided in order; the page number of the first image is 1 unless told otherwise.`;
  return kind === "question"
    ? `${shared}
Each object: { "question_number": "4", "topic": one of ${JSON.stringify(TOPICS[paper])}, "total_marks": <int>, "pages": [page numbers], "blocks": [...] }
Ignore the instruction sheet / information sheet / formula sheet; only real questions.`
    : `${shared}
Each object: { "question_number": "4", "pages": [page numbers], "blocks": [...] } — match the question numbers of the paper. Keep mark allocations (A, CA, M...) from the memo inside the text.`;
}

function render(pdfPath: string, out: string, prefix: string): string[] {
  mkdirSync(out, { recursive: true });
  execFileSync("pdftoppm", ["-r", "200", "-png", pdfPath, join(out, prefix)]);
  return readdirSync(out).filter((f) => f.startsWith(prefix) && f.endsWith(".png"))
    .sort((a, b) => Number(a.match(/(\d+)\.png$/)![1]) - Number(b.match(/(\d+)\.png$/)![1]));
}

async function askModel(kind: "question" | "memo", dir: string, files: string[]) {
  const content: (Anthropic.Messages.TextBlockParam | Anthropic.Messages.ImageBlockParam)[] = [];
  files.forEach((f, i) => {
    content.push({ type: "text", text: `Page ${i + 1}:` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/png", data: readFileSync(join(dir, f)).toString("base64") } });
  });
  content.push({ type: "text", text: prompt(kind) });
  const msg = await ai.messages.stream({ model: MODEL, max_tokens: 32000, messages: [{ role: "user", content }] }).finalMessage();
  const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("").trim()
    .replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(text) as any[];
}

async function upload(bucket: string, path: string, file: string, contentType: string) {
  const { error } = await sb.storage.from(bucket).upload(path, readFileSync(file), { contentType, upsert: true });
  if (error) throw new Error(`upload ${path}: ${error.message}`);
}

(async () => {
  const work = join("work", `${year}-${session!.replace(/\W/g, "")}-p${paper}`);
  const qPages = render(pdf!, join(work, "q"), "p");
  const mPages = render(memoPdf!, join(work, "m"), "m");
  console.log(`Rendered ${qPages.length} paper pages, ${mPages.length} memo pages`);

  const { data: row, error } = await sb.from("papers").upsert(
    { year, session, paper_number: paper, page_count: qPages.length, memo_page_count: mPages.length },
    { onConflict: "year,session,paper_number" }).select("id").single();
  if (error || !row) throw error;
  const id = row.id;

  const base = `pages/${id}`;
  await upload("paper-files", `${base}/source.pdf`, pdf!, "application/pdf");
  await upload("paper-files", `${base}/memo.pdf`, memoPdf!, "application/pdf");
  for (let i = 0; i < qPages.length; i++) await upload("paper-files", `${base}/p-${i + 1}.png`, join(work, "q", qPages[i]), "image/png");
  for (let i = 0; i < mPages.length; i++) await upload("paper-files", `${base}/memo-p-${i + 1}.png`, join(work, "m", mPages[i]), "image/png");
  await sb.from("papers").update({ source_pdf_path: `${base}/source.pdf`, memo_pdf_path: `${base}/memo.pdf` }).eq("id", id);

  console.log("Extracting questions…");
  const questions = await askModel("question", join(work, "q"), qPages);
  console.log("Extracting memo…");
  const memos = await askModel("memo", join(work, "m"), mPages);
  const memoBy = new Map(memos.map((m) => [String(m.question_number), m]));

  const { data: topics } = await sb.from("topics").select("id,slug");
  const topicId = new Map((topics ?? []).map((t) => [t.slug, t.id]));

  for (const q of questions) {
    const m = memoBy.get(String(q.question_number));
    const notes: string[] = [];
    if (!m) notes.push("No memo matched by the model — transcribe manually.");
    if (!topicId.get(q.topic)) notes.push(`Model suggested unknown topic "${q.topic}".`);
    // Never overwrite work a human already verified.
    const { data: existing } = await sb.from("questions").select("id,status").eq("paper_id", id).eq("question_number", String(q.question_number)).maybeSingle();
    if (existing && existing.status !== "draft") { console.log(`Q${q.question_number}: already ${existing.status}, skipped`); continue; }
    const { error: e } = await sb.from("questions").upsert({
      paper_id: id, question_number: String(q.question_number), topic_id: topicId.get(q.topic) ?? null,
      total_marks: q.total_marks ?? null, content: q.blocks, memo: m?.blocks ?? [],
      source_pages: q.pages ?? [], memo_pages: m?.pages ?? [], status: "draft", review_notes: notes.join(" ") || null,
    }, { onConflict: "paper_id,question_number" });
    console.log(`Q${q.question_number}: ${e ? "ERROR " + e.message : "draft saved"}`);
  }
  console.log("Done. Review at /admin/review");
})().catch((e) => { console.error(e); process.exit(1); });
