import { NextResponse } from "next/server";
import sharp from "sharp";
import { db } from "@/lib/supabase";

/** Crop a box (fractions of the page image) out of a rendered page and store it in question-images. */
export async function POST(req: Request) {
  const { paperId, memo, page, box, questionId } = await req.json();
  const ok = [box?.x, box?.y, box?.w, box?.h].every((n) => typeof n === "number" && n >= 0 && n <= 1) && box.w > 0.01 && box.h > 0.01;
  if (!ok || !Number.isInteger(paperId) || !Number.isInteger(page)) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const src = `pages/${paperId}/${memo ? "memo-p" : "p"}-${page}.png`;
  const { data: file, error } = await db().storage.from("paper-files").download(src);
  if (error || !file) return NextResponse.json({ error: "page image not found" }, { status: 404 });

  const buf = Buffer.from(await file.arrayBuffer());
  const meta = await sharp(buf).metadata();
  const W = meta.width!, H = meta.height!;
  const left = Math.round(box.x * W), top = Math.round(box.y * H);
  const width = Math.min(W - left, Math.round(box.w * W)), height = Math.min(H - top, Math.round(box.h * H));
  const out = await sharp(buf).extract({ left, top, width, height }).png().toBuffer();

  const path = `questions/p${paperId}-q${questionId}-${memo ? "memo-" : ""}${Date.now()}.png`;
  const up = await db().storage.from("question-images").upload(path, out, { contentType: "image/png" });
  if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });
  return NextResponse.json({ path });
}
