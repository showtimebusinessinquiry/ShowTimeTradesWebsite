-- ─────────────────────────────────────────────
-- WATCHLIST V2: lists table + extended columns
-- ─────────────────────────────────────────────

-- Named watchlist lists (replaces hardcoded client-side DEFAULT_LISTS)
create table public.watchlist_lists (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  name       text        not null,
  created_at timestamptz not null default now()
);

alter table public.watchlist_lists enable row level security;

create policy "Users can view their own watchlist lists"
  on public.watchlist_lists for select
  using (auth.uid() = user_id);

create policy "Users can insert their own watchlist lists"
  on public.watchlist_lists for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own watchlist lists"
  on public.watchlist_lists for update
  using (auth.uid() = user_id);

create policy "Users can delete their own watchlist lists"
  on public.watchlist_lists for delete
  using (auth.uid() = user_id);

create index watchlist_lists_user_id_idx on public.watchlist_lists(user_id);

-- Extend existing watchlist table with rich trading data
alter table public.watchlist
  add column if not exists list_id       uuid references public.watchlist_lists(id) on delete set null,
  add column if not exists bias          text check (bias in ('Bullish', 'Bearish', 'Neutral')),
  add column if not exists status_type   text check (status_type in ('Watching', 'Ready', 'In Trade', 'Avoid')),
  add column if not exists entry_price   numeric(12,4),
  add column if not exists target_price  numeric(12,4),
  add column if not exists stop_price    numeric(12,4),
  add column if not exists earnings_date date,
  add column if not exists thesis        text;

create index watchlist_list_id_idx on public.watchlist(list_id);
