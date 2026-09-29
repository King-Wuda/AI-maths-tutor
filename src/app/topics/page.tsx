import Link from "next/link";
import { db } from "@/lib/supabase";
import { topicRank } from "@/lib/topics";

export const revalidate = 3600;

export default async function Topics() {
  const { data: topics } = await db().from("topics").select("id,slug,name,paper").eq("is_live", true);
  const { data: qs } = await db().from("questions").select("topic_id").eq("status", "verified");
  const counts = new Map<number, number>();
  (qs ?? []).forEach((q) => counts.set(q.topic_id, (counts.get(q.topic_id) ?? 0) + 1));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Choose a topic</h1>
      {[1, 2].map((paper) => {
        const list = (topics ?? []).filter((t) => t.paper === paper && (counts.get(t.id) ?? 0) > 0)
          .sort((a, b) => topicRank(paper, a.slug) - topicRank(paper, b.slug));
        if (!list.length) return null;
        return (
          <section key={paper} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Paper {paper}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {list.map((t) => (
                <Link key={t.id} href={`/topics/${t.slug}`} className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-slate-500">{counts.get(t.id)} questions</div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
      {!qs?.length && <p className="text-slate-500">Questions are being verified. Check back soon.</p>}
    </div>
  );
}
