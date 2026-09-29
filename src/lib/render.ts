import katex from "katex";
import type { Block, RenderedBlock } from "./types";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function tex(src: string, display = false): string {
  return katex.renderToString(src, { displayMode: display, throwOnError: false, strict: false });
}

/** Text with inline maths in $...$ → safe HTML. Everything outside $...$ is escaped. */
export function renderText(value: string): string {
  const parts = value.split(/(\$[^$]+\$)/g);
  return parts
    .map((p) =>
      p.length > 2 && p.startsWith("$") && p.endsWith("$")
        ? tex(p.slice(1, -1))
        : esc(p).replace(/\n/g, "<br/>"),
    )
    .join("");
}

export function imageUrl(path: string | null | undefined, bucket = "question-images"): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !base) return null;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

export function renderBlocks(blocks: Block[] | null | undefined): RenderedBlock[] {
  return (blocks ?? []).map((b): RenderedBlock => {
    switch (b.type) {
      case "text":
        return { type: "html", html: renderText(b.value) };
      case "latex":
        return { type: "html", html: tex(b.value, b.display ?? true), display: b.display ?? true };
      case "image":
        return { type: "image", src: imageUrl(b.path), alt: b.alt ?? "Diagram" };
      case "subq":
        return { type: "subq", label: b.label, marks: b.marks, blocks: renderBlocks(b.blocks) };
    }
  });
}

/** True if any image block is still an unfilled placeholder. */
export function hasPlaceholder(blocks: Block[]): boolean {
  return blocks.some((b) =>
    b.type === "image" ? !b.path : b.type === "subq" ? hasPlaceholder(b.blocks) : false,
  );
}

export const SESSION_SHORT: Record<string, string> = {
  November: "Nov", "May/June": "May/Jun", "Feb/March": "Feb/Mar",
};
export function questionLabel(p: { year: number; session: string; paper_number: number }, qn: string) {
  return `${SESSION_SHORT[p.session] ?? p.session} ${p.year} · P${p.paper_number} · Q${qn}`;
}
