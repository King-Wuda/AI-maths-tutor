-- Phase 0 schema. Run in the Supabase SQL editor.
-- Deviations from the spec are marked "ADDED".
create table topics (
  id serial primary key,
  slug text unique not null,
  name text not null,
  paper smallint not null check (paper in (1,2)),
  is_live boolean default false
);

create table papers (
  id serial primary key,
  year smallint not null,
  session text not null,
  paper_number smallint not null check (paper_number in (1,2)),
  source_pdf_path text,
  memo_pdf_path text,
  page_count smallint,          -- ADDED: pages rendered to paper-files/pages/{id}/p-{n}.png
  memo_page_count smallint,     -- ADDED: memo-p-{n}.png
  unique (year, session, paper_number)
);

create table questions (
  id serial primary key,
  paper_id int references papers(id) on delete cascade,
  question_number text not null,
  topic_id int references topics(id),
  total_marks smallint,
  content jsonb not null,
  memo jsonb not null,
  source_pages int[] default '{}',  -- ADDED: paper page numbers (review screen)
  memo_pages int[] default '{}',    -- ADDED: memo page numbers (review screen)
  status text default 'draft' check (status in ('draft','verified','rejected')),
  review_notes text,
  created_at timestamptz default now(),
  unique (paper_id, question_number) -- ADDED: makes re-extraction idempotent
);

create table events (
  id bigserial primary key,
  anon_id text not null,
  user_id uuid,
  event_type text not null,
  topic_id int,
  question_id int,
  exam_id uuid,
  value text,                        -- ADDED: self_mark value ('got'|'partly'|'missed'), lead role etc.
  created_at timestamptz default now()
);

create table exams (
  id uuid primary key default gen_random_uuid(),
  anon_id text not null,
  paper_number smallint,
  question_ids int[] not null,
  created_at timestamptz default now()
);

create table leads (
  id serial primary key,
  anon_id text,
  email text,
  whatsapp text,
  role text,
  created_at timestamptz default now()
);

create index on questions (topic_id, status);
create index on events (anon_id, created_at);
create index on events (event_type, created_at);

-- The app talks to Postgres only from the server with the service-role key.
-- Enable RLS with no policies so the anon key can never read or write anything.
alter table topics enable row level security;
alter table papers enable row level security;
alter table questions enable row level security;
alter table events enable row level security;
alter table exams enable row level security;
alter table leads enable row level security;

insert into topics (slug, name, paper, is_live) values
  ('algebra',              'Algebra, equations and inequalities', 1, false),
  ('sequences-series',     'Sequences and series',                1, false),
  ('functions-and-graphs', 'Functions and graphs',                1, true),
  ('finance',              'Finance, growth and decay',           1, false),
  ('differential-calculus','Differential calculus',               1, true),
  ('probability',          'Probability',                         1, false),
  ('statistics',           'Statistics',                          2, false),
  ('analytical-geometry',  'Analytical geometry',                 2, false),
  ('trigonometry',         'Trigonometry',                        2, true),
  ('euclidean-geometry',   'Euclidean geometry',                  2, false);

-- Stats for /admin/stats. Days are Africa/Johannesburg calendar days.
create or replace function stats_summary(days int default 30)
returns jsonb language sql stable as $$
with ev as (
  select anon_id, event_type, topic_id, question_id, exam_id,
         (created_at at time zone 'Africa/Johannesburg')::date as d
  from events
),
first_seen as (select anon_id, min(d) as first_d from ev group by anon_id),
per_user as (
  select f.anon_id, f.first_d,
         count(distinct e.d) as active_days,
         bool_or(e.d = f.first_d + 1) as d1,
         bool_or(e.d between f.first_d + 1 and f.first_d + 7) as within7
  from first_seen f join ev e using (anon_id)
  group by f.anon_id, f.first_d
),
eligible7 as (
  select * from per_user
  where first_d <= (now() at time zone 'Africa/Johannesburg')::date - 7
),
eligible1 as (
  select * from per_user
  where first_d <= (now() at time zone 'Africa/Johannesburg')::date - 1
)
select jsonb_build_object(
  'daily', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'visitors', n) order by d)
     from (select d, count(distinct anon_id) n from ev
           where d >= (now() at time zone 'Africa/Johannesburg')::date - days
           group by d) t), '[]'::jsonb),
  'total_users', (select count(*) from per_user),
  'returning_users', (select count(*) from per_user where active_days >= 2),
  'return_d1_eligible', (select count(*) from eligible1),
  'return_d1', (select count(*) from eligible1 where d1),
  'return_7_eligible', (select count(*) from eligible7),
  'return_7', (select count(*) from eligible7 where within7),
  'topics', coalesce((select jsonb_agg(jsonb_build_object(
        'name', t.name, 'opened', coalesce(o.n,0), 'attempts', coalesce(a.n,0))
        order by coalesce(o.n,0) + coalesce(a.n,0) desc)
     from topics t
     left join (select topic_id, count(*) n from ev where event_type='topic_opened' group by topic_id) o on o.topic_id = t.id
     left join (select topic_id, count(*) n from ev where event_type='self_mark' group by topic_id) a on a.topic_id = t.id
     where t.is_live), '[]'::jsonb),
  'users_with_attempt', (select count(distinct anon_id) from ev where event_type='self_mark'),
  'attempts', (select count(*) from ev where event_type='self_mark'),
  'questions_viewed', (select count(*) from ev where event_type='question_viewed'),
  'exams_created', (select count(*) from ev where event_type='exam_created'),
  'exams_completed', (select count(distinct exam_id) from ev where event_type='exam_completed'),
  'leads', (select count(*) from leads)
);
$$;
