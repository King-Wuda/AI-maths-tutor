import Link from "next/link";

export const revalidate = 3600;

export default function Home() {
  return (
    <div className="space-y-8 py-6">
      <section className="space-y-3">
        <h1 className="text-3xl font-extrabold leading-tight">Practise real Grade 12 Maths past-paper questions, by topic.</h1>
        <p className="text-slate-600">Drill the topics you struggle with, build a fresh mock exam from real DBE papers, and check the official memo. Free.</p>
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/topics" className="rounded-xl bg-blue-600 p-5 text-center text-lg font-semibold text-white">Practise a topic</Link>
        <Link href="/exam/new" className="rounded-xl border-2 border-blue-600 p-5 text-center text-lg font-semibold text-blue-700">Create an exam</Link>
      </div>
      <ul className="space-y-1 text-sm text-slate-600">
        <li>✓ Real DBE questions from the last ~10 years</li>
        <li>✓ Official memos, revealed after you try</li>
        <li>✓ Self-mark and see your weakest topic</li>
      </ul>
    </div>
  );
}
