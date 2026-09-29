"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Blocks } from "@/components/Blocks";
import { renderBlocks } from "@/lib/render";
import type { Block } from "@/lib/types";
import { BlockEditor, type Crop } from "./BlockEditor";

type Paper = { id: number; year: number; session: string; paper_number: number; page_count?: number; memo_page_count?: number };
type Item = { id: number; question_number: string; topic_id: number | null; status: string; paper_id: number; papers: Paper };
type TopicRow = { id: number; slug: string; name: string; paper: number };
type Full = {
  id: number; question_number: string; topic_id: number | null; total_marks: number | null;
  content: Block[]; memo: Block[]; status: string; review_notes: string | null;
  source_pages: number[]; memo_pages: number[]; papers: Paper;
};

const pageUrl = (paperId: number, memo: boolean, n: number) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/paper-files/pages/${paperId}/${memo ? "memo-p" : "p"}-${n}.png`;

export function Review() {
  const [items, setItems] = useState<Item[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [q, setQ] = useState<Full | null>(null);
  const [tab, setTab] = useState<"content" | "memo">("content");
  const [page, setPage] = useState(0);
  const [crop, setCrop] = useState<Crop>(null);
  const [msg, setMsg] = useState("");
  const [dirty, setDirty] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const imgBox = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    const r = await (await fetch("/api/admin/review-data")).json();
    setItems(r.questions); setTopics(r.topics);
    return r.questions as Item[];
  }, []);
  const open = useCallback(async (id: number) => {
    const r = await fetch(`/api/admin/questions/${id}`);
    if (!r.ok) return;
    setQ(await r.json()); setPage(0); setCrop(null); setDirty(false); setMsg(""); setTab("content");
  }, []);

  useEffect(() => { loadList().then((l) => { const d = l.find((x) => x.status === "draft"); if (d) open(d.id); }); }, [loadList, open]);

  const nextDraft = useCallback((list: Item[] = items, fromId = q?.id) => {
    const drafts = list.filter((x) => x.status === "draft" && x.id !== fromId);
    const after = drafts.find((x) => x.id > (fromId ?? 0)) ?? drafts[0];
    if (after) open(after.id); else setMsg("No more drafts 🎉");
  }, [items, q?.id, open]);

  const save = useCallback(async (status?: string) => {
    if (!q) return false;
    const r = await fetch(`/api/admin/questions/${q.id}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: q.content, memo: q.memo, topic_id: q.topic_id, total_marks: q.total_marks, review_notes: q.review_notes, ...(status ? { status } : {}) }),
    });
    const j = await r.json();
    if (!r.ok) { setMsg(`⚠ ${j.error}`); return false; }
    setDirty(false); setMsg(status ? `Marked ${status}` : "Saved");
    const list = await loadList();
    if (status) nextDraft(list, q.id);
    else setQ({ ...q });
    return true;
  }, [q, loadList, nextDraft]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.key === "n") { e.preventDefault(); nextDraft(); }
      if (e.key === "v") { e.preventDefault(); save("verified"); }
      if (e.key === "s") { e.preventDefault(); save(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [nextDraft, save]);

  const progress = useMemo(() => {
    const by = (key: (i: Item) => string) => {
      const m = new Map<string, { v: number; t: number }>();
      items.forEach((i) => { const k = key(i); const c = m.get(k) ?? { v: 0, t: 0 }; c.t++; if (i.status === "verified") c.v++; m.set(k, c); });
      return [...m.entries()];
    };
    return {
      paper: by((i) => `${i.papers.year} ${i.papers.session} P${i.papers.paper_number}`),
      topic: by((i) => topics.find((t) => t.id === i.topic_id)?.name ?? "Untagged"),
    };
  }, [items, topics]);

  if (!q) return <div className="space-y-2"><p>{msg || "No drafts loaded."}</p><Progress p={progress} /></div>;

  const isMemo = tab === "memo";
  const pages = isMemo ? q.memo_pages : q.source_pages;
  const pageNo = pages[page] ?? null;
  const setBlocks = (b: Block[]) => { setQ({ ...q, [tab]: b }); setDirty(true); };

  const pt = (e: React.PointerEvent) => {
    const r = imgBox.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  const onCrop = async (_i: number, apply: (path: string) => void) => {
    if (!crop || pageNo == null) return;
    setMsg("Cropping…");
    const r = await fetch("/api/admin/crop", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ paperId: q.papers.id, memo: isMemo, page: pageNo, box: crop, questionId: q.id }) });
    const j = await r.json();
    if (!r.ok) return setMsg(`⚠ ${j.error}`);
    apply(j.path); setCrop(null); setDirty(true); setMsg("Diagram attached (remember to save)");
  };

  return (
    <div className="space-y-3">
      <Progress p={progress} />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select className="max-w-full rounded border p-1" value={q.id} onChange={(e) => open(Number(e.target.value))}>
          {items.map((i) => <option key={i.id} value={i.id}>[{i.status}] {i.papers.year} {i.papers.session} P{i.papers.paper_number} Q{i.question_number}</option>)}
        </select>
        <select className="rounded border p-1" value={q.topic_id ?? ""} onChange={(e) => { setQ({ ...q, topic_id: e.target.value ? Number(e.target.value) : null }); setDirty(true); }}>
          <option value="">— topic —</option>
          {topics.map((t) => <option key={t.id} value={t.id}>P{t.paper} · {t.name}</option>)}
        </select>
        <label>marks <input type="number" className="w-16 rounded border p-1" value={q.total_marks ?? ""} onChange={(e) => { setQ({ ...q, total_marks: e.target.value ? Number(e.target.value) : null }); setDirty(true); }} /></label>
        <span className="rounded bg-slate-200 px-2 py-0.5 text-xs">{q.status}{dirty ? " · unsaved" : ""}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* LEFT: original page */}
        <div className="space-y-2">
          <div className="flex gap-2 text-sm">
            {(["content", "memo"] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); setPage(0); setCrop(null); }} className={`rounded px-3 py-1 ${tab === t ? "bg-blue-600 text-white" : "border"}`}>{t === "content" ? "Question" : "Memo"}</button>
            ))}
            {pages.map((p, i) => <button key={p} onClick={() => { setPage(i); setCrop(null); }} className={`rounded border px-2 ${i === page ? "bg-slate-200" : ""}`}>p{p}</button>)}
          </div>
          {pageNo != null ? (
            <div ref={imgBox} className="relative touch-none select-none"
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = pt(e); setCrop(null); }}
              onPointerMove={(e) => { if (!drag.current) return; const p = pt(e); const s = drag.current;
                setCrop({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) }); }}
              onPointerUp={() => { drag.current = null; }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pageUrl(q.papers.id, isMemo, pageNo)} alt={`page ${pageNo}`} className="w-full rounded border" draggable={false} />
              {crop && <div className="absolute border-2 border-red-500 bg-red-500/20" style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.w * 100}%`, height: `${crop.h * 100}%` }} />}
            </div>
          ) : <p className="text-sm text-slate-500">No source pages recorded for this {tab}.</p>}
          <p className="text-xs text-slate-500">Drag on the page to draw a crop, then press “Use drawn crop” on an image block.</p>
        </div>

        {/* RIGHT: editor + preview */}
        <div className="space-y-3">
          <BlockEditor blocks={q[tab]} onChange={setBlocks} onCrop={onCrop} hasCrop={!!crop} />
          <div className="rounded-xl border bg-white p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Preview ({tab})</h3>
            <Blocks blocks={renderBlocks(q[tab])} />
          </div>
          <textarea className="w-full rounded border p-2 text-sm" rows={2} placeholder="Review notes" value={q.review_notes ?? ""} onChange={(e) => { setQ({ ...q, review_notes: e.target.value }); setDirty(true); }} />
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-2 border-t bg-white px-4 py-2 text-sm">
        <button className="rounded bg-green-600 px-4 py-2 font-semibold text-white" onClick={() => save("verified")}>Verify (Alt+V)</button>
        <button className="rounded bg-red-600 px-4 py-2 font-semibold text-white" onClick={() => save("rejected")}>Reject</button>
        <button className="rounded border px-4 py-2" onClick={() => save()}>Save draft (Alt+S)</button>
        <button className="rounded border px-4 py-2" onClick={() => nextDraft()}>Next draft (Alt+N)</button>
        <span className="text-slate-600">{msg}</span>
      </div>
    </div>
  );
}

function Progress({ p }: { p: { paper: [string, { v: number; t: number }][]; topic: [string, { v: number; t: number }][] } }) {
  const chip = ([k, c]: [string, { v: number; t: number }]) => (
    <span key={k} className="rounded-full border bg-white px-2 py-0.5 text-xs">{k}: <b>{c.v}/{c.t}</b></span>
  );
  return <div className="space-y-1"><div className="flex flex-wrap gap-1">{p.paper.map(chip)}</div><div className="flex flex-wrap gap-1">{p.topic.map(chip)}</div></div>;
}
