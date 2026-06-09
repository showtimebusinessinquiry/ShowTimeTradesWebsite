-- ─────────────────────────────────────────────
-- ADMINS
-- ─────────────────────────────────────────────
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.admins enable row level security;

-- Any authenticated user can query this table to check if they are an admin.
-- This is intentionally open so the frontend can gate the admin UI.
create policy "Authenticated users can read admins"
  on public.admins for select
  using (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────
-- FEEDBACK
-- ─────────────────────────────────────────────
create table public.feedback (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  type        text        not null check (type in ('bug', 'suggestion')),
  title       text        not null,
  description text,
  status      text        not null default 'open'
              check (status in ('open', 'in_progress', 'resolved')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.feedback enable row level security;

-- Any authenticated user can submit
create policy "Users can insert their own feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id);

-- Users can read their own; admins can read all
create policy "Users read own feedback, admins read all"
  on public.feedback for select
  using (
    auth.uid() = user_id
    or exists (select 1 from public.admins where user_id = auth.uid())
  );

-- Only admins can update status
create policy "Admins can update feedback status"
  on public.feedback for update
  using (exists (select 1 from public.admins where user_id = auth.uid()));

-- updated_at trigger
create trigger feedback_updated_at
  before update on public.feedback
  for each row execute procedure public.handle_updated_at();

-- Indexes
create index feedback_user_id_idx on public.feedback(user_id);
create index feedback_status_idx  on public.feedback(status);
create index feedback_created_idx on public.feedback(created_at desc);

-- ─────────────────────────────────────────────
-- HOW TO ADD AN ADMIN
-- Run this in the Supabase SQL editor, replacing the UUID with the user's ID
-- (find it in Authentication → Users):
--
--   insert into public.admins (user_id) values ('<user-uuid-here>');
-- ─────────────────────────────────────────────
