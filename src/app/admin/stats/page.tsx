import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type S = {
  daily: { day: string; visitors: number }[]; total_users: number; returning_users: number;
  return_d1_eligible: number; return_d1: number; return_7_eligible: number; return_7: number;
  topics: { name: string; opened: number; attempts: number }[];
  users_with_attempt: number; attempts: number; questions_viewed: number;
  exams_created: number; exams_completed: number; leads: number;
};
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "n/a");

export default async function Stats() {
  const { data, error } = await db().rpc("stats_summary", { days: 30 });
  if (error) return <p className="text-red-600">Stats error: {error.message}</p>;
  const s = data as S;
  const cards: [string, string, string?][] = [
    ["Unique visitors (all time)", String(s.total_users)],
    ["Returning (2+ days active)", pct(s.returning_users, s.total_users), `${s.returning_users} users`],
    ["Came back next day (D1)", pct(s.return_d1, s.return_d1_eligible), `of ${s.return_d1_eligible} eligible`],
    ["Came back within 7 days", pct(s.return_7, s.return_7_eligible), `of ${s.return_7_eligible} eligible (first seen 7+ days ago)`],
    ["Questions attempted / user", s.users_with_attempt ? (s.attempts / s.users_with_attempt).toFixed(1) : "n/a", `${s.attempts} self-marks, ${s.users_with_attempt} users`],
    ["Questions viewed", String(s.questions_viewed)],
    ["Exams created → completed", `${s.exams_created} → ${s.exams_completed}`, pct(s.exams_completed, s.exams_created)],
    ["Leads", String(s.leads)],
  ];
  const max = Math.max(1, ...s.daily.map((d) => d.visitors));
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Stats</h1>
      <div className="grid grid-cols-2 gap-3">
        {cards.map(([l, v, sub]) => (
          <div key={l} className="rounded-lg border bg-white p-3">
            <div className="text-xs text-slate-500">{l}</div><div className="text-2xl font-bold">{v}</div>
            {sub && <div className="text-xs text-slate-500">{sub}</div>}
          </div>
        ))}
      </div>
      <section>
        <h2 className="mb-2 font-semibold">Unique visitors per day (last 30 days)</h2>
        <div className="space-y-1">
          {s.daily.map((d) => (
            <div key={d.day} className="flex items-center gap-2 text-xs">
              <span className="w-20 tabular-nums">{d.day}</span>
              <div className="h-3 rounded bg-blue-600" style={{ width: `${(d.visitors / max) * 70}%` }} /><span>{d.visitors}</span>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Most-drilled topics</h2>
        <table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th>Topic</th><th>Opened</th><th>Attempts</th></tr></thead>
          <tbody>{s.topics.map((t) => <tr key={t.name} className="border-t"><td className="py-1">{t.name}</td><td>{t.opened}</td><td>{t.attempts}</td></tr>)}</tbody></table>
      </section>
    </div>
  );
}
