# Grade 12 Maths Practice — Phase 0 demand test

Free web app: drill real DBE past-paper questions by topic, generate mock exams, reveal official memos, self-mark. Its only job is to measure whether learners come back. Spec: see the project brief (Next.js 14, Supabase, KaTeX, Vercel).

## Setup
1. Create a Supabase project. Run `supabase/schema.sql` in the SQL editor (tables, RLS, seed topics, `stats_summary()`).
2. Create two **public** Storage buckets: `question-images` and `paper-files`.
3. `cp .env.example .env.local` and fill in the values. The service-role key is server-only.
4. `npm install && npm run dev`.

## Content pipeline
```
npm run extract -- --year 2023 --session November --paper 1 --pdf p1.pdf --memo p1-memo.pdf
```
Needs `pdftoppm` (poppler-utils). Renders pages at 200 dpi, uploads the PDFs and page images, asks the model for block-format JSON, and inserts every question as `draft`. Then open `/admin/review`: compare with the page image, fix LaTeX, crop diagrams, confirm topic, **Verify** (Alt+V) → next draft (Alt+N). Save is Alt+S. Verify is refused while any diagram placeholder is unfilled, the topic is unset or the memo is empty.

Only `verified` questions are ever served. To make a topic live/hidden: `update topics set is_live = ... where slug = ...`. A live topic only appears once it has verified questions.

## Analytics
`/admin/stats` (admin password) shows daily visitors, returning-user rates (2+ days, D1, within-7-days), top topics, attempts per user, exams created vs completed, leads. Success signal = repeat usage, not sign-ups.

## Notes / deviations from the spec
- `events.value` added (self-mark value, lead role, page path); `questions.source_pages/memo_pages` and `papers.page_count/memo_page_count` added for the review screen; `unique(paper_id, question_number)` added so re-extraction is idempotent.
- All DB access is server-side with the service-role key; RLS is on with no policies.
- Admin auth: single password (`ADMIN_PASSWORD`) → signed-hash cookie, enforced in middleware.
- Memos are shipped to the browser with the question pool (needed for instant "Show memo"); acceptable for a free demand test.

## Checks
`npm run typecheck && npm test && npm run build`
