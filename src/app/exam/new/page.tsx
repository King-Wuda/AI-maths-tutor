import { db } from "@/lib/supabase";
import { NewExam } from "./NewExam";

export const revalidate = 3600;

export default async function Page() {
  const { data: topics } = await db().from("topics").select("slug,name,paper").eq("is_live", true);
  const { data: qs } = await db().from("questions").select("topic_id, topics(slug)").eq("status", "verified");
  const withQs = new Set((qs ?? []).map((q) => (q.topics as unknown as { slug: string } | null)?.slug));
  return <NewExam topics={(topics ?? []).filter((t) => withQs.has(t.slug))} />;
}
