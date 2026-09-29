"use client";
import type { Block } from "@/lib/types";

type Crop = { x: number; y: number; w: number; h: number } | null;
type Props = {
  blocks: Block[];
  onChange: (b: Block[]) => void;
  onCrop: (i: number, apply: (path: string) => void) => void; // request crop → path for image block
  hasCrop: boolean;
  depth?: number;
};
export type { Crop };

const blank = (t: Block["type"]): Block =>
  t === "text" ? { type: "text", value: "" } : t === "latex" ? { type: "latex", value: "", display: true }
  : t === "image" ? { type: "image", path: null, alt: "" } : { type: "subq", label: "", marks: 0, blocks: [] };

export function BlockEditor({ blocks, onChange, onCrop, hasCrop, depth = 0 }: Props) {
  const set = (i: number, b: Block) => onChange(blocks.map((x, j) => (j === i ? b : x)));
  const move = (i: number, d: number) => {
    const j = i + d; if (j < 0 || j >= blocks.length) return;
    const r = [...blocks]; [r[i], r[j]] = [r[j], r[i]]; onChange(r);
  };
  return (
    <div className={`space-y-2 ${depth ? "border-l-2 border-slate-300 pl-2" : ""}`}>
      {blocks.map((b, i) => (
        <div key={i} className="rounded border bg-white p-2 text-sm">
          <div className="mb-1 flex items-center gap-1 text-xs text-slate-500">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">{b.type}</span>
            <span className="flex-1" />
            <button onClick={() => move(i, -1)}>↑</button><button onClick={() => move(i, 1)}>↓</button>
            <button className="text-red-600" onClick={() => onChange(blocks.filter((_, j) => j !== i))}>✕</button>
          </div>
          {(b.type === "text" || b.type === "latex") && (
            <textarea className="w-full rounded border p-1 font-mono text-xs" rows={b.type === "text" ? 3 : 2} value={b.value}
              onChange={(e) => set(i, { ...b, value: e.target.value })} />
          )}
          {b.type === "latex" && (
            <label className="text-xs"><input type="checkbox" checked={b.display ?? true} onChange={(e) => set(i, { ...b, display: e.target.checked })} /> display</label>
          )}
          {b.type === "image" && (
            <div className="space-y-1 text-xs">
              <div className={b.path ? "text-green-700" : "font-semibold text-red-600"}>{b.path ?? `Placeholder${b.page ? ` (page ${b.page})` : ""}${b.note ? `: ${b.note}` : ""}`}</div>
              <input className="w-full rounded border p-1" placeholder="alt text" value={b.alt ?? ""} onChange={(e) => set(i, { ...b, alt: e.target.value })} />
              <button disabled={!hasCrop} className="rounded bg-blue-600 px-2 py-1 text-white disabled:opacity-40"
                onClick={() => onCrop(i, (path) => set(i, { ...b, path }))}>Use drawn crop</button>
            </div>
          )}
          {b.type === "subq" && (
            <div className="space-y-1">
              <div className="flex gap-2 text-xs">
                <input className="w-20 rounded border p-1" placeholder="4.1.1" value={b.label} onChange={(e) => set(i, { ...b, label: e.target.value })} />
                <input className="w-16 rounded border p-1" type="number" placeholder="marks" value={b.marks ?? ""} onChange={(e) => set(i, { ...b, marks: e.target.value === "" ? undefined : Number(e.target.value) })} />
              </div>
              <BlockEditor blocks={b.blocks} depth={depth + 1} hasCrop={hasCrop} onCrop={onCrop} onChange={(nb) => set(i, { ...b, blocks: nb })} />
            </div>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-1 text-xs">
        {(["text", "latex", "image", "subq"] as const).map((t) => (
          <button key={t} className="rounded border px-2 py-0.5" onClick={() => onChange([...blocks, blank(t)])}>+ {t}</button>
        ))}
      </div>
    </div>
  );
}
