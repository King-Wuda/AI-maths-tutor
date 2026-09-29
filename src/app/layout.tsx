import type { Metadata } from "next";
import Link from "next/link";
import "katex/dist/katex.min.css";
import "./globals.css";
import { PageView } from "@/components/PageView";
import { LeadPrompt } from "@/components/LeadPrompt";

export const metadata: Metadata = {
  title: "Grade 12 Maths Practice — real past-paper questions by topic",
  description: "Free Grade 12 Maths practice: drill DBE past-paper questions by topic, build mock exams, and check the official memos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-bold text-blue-700">Maths12</Link>
            <div className="flex gap-4 text-sm">
              <Link href="/topics">Topics</Link>
              <Link href="/exam/new">Create exam</Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
        <PageView />
        <LeadPrompt />
      </body>
    </html>
  );
}
