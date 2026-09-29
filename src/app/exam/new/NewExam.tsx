"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type T = { slug: string; name: string; paper: number };

export function NewExam({ topics }: { topics: T[] }) {
  const router = useRouter();
  const [paper, setPaper] = useState<1 | 2>(1);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const list = topics.filter((t) => t.paper === paper);

  async function go() {
    setBusy(true); setErr("");
    const res = await fetch("/api/exam", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ paper, topics: picked.filter((s) => list.some((t) => t.slug === s)) }),
    });
    const j = await res.json();
    if (res.ok) router.push(`/exam/${j.id}`); else { setErr(j.error ?? "Failed"); setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Create an exam</h1>
      <div className="grid grid-cols-2 gap-2">
        {[1, 2].map((p) => (
          <button key={p} onClick={() => { setPaper(p as 1 | 2); setPicked([]); }}
            className={`rounded-lg border-2 py-3 font-semibold ${paper === p ? "border-blue-600 bg-blue-50 text-blue-700" : ""}`}>Paper {p}</button>
        ))}
      </div>
      <div className="space-y-2">
        <p className="text-sm text-slate-600">Topics (leave empty to include all live topics):</p>
        {list.length === 0 && <p className="text-sm text-slate-500">No verified topics for this paper yet.</p>}
        {list.map((t) => (
          <label key={t.slug} className="flex items-center gap-3 rounded-lg border bg-white p-3">
            <input type="checkbox" checked={picked.includes(t.slug)}
              onChange={() => setPicked(picked.includes(t.slug) ? picked.filter((s) => s !== t.slug) : [...picked, t.slug])} />
            {t.name}
          </label>
        ))}
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button disabled={busy || !list.length} onClick={go}
        className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Building…" : "Generate exam"}</button>
    </div>
  );
}
