-- ─────────────────────────────────────────────
-- PORTFOLIO SNAPSHOTS: daily history table
-- ─────────────────────────────────────────────

create table public.portfolio_snapshots (
  id                 uuid         primary key default uuid_generate_v4(),
  user_id            uuid         not null references auth.users(id) on delete cascade,
  snapshot_date      date         not null,
  total_market_value numeric(14,4),
  total_cost_basis   numeric(14,4),
  unrealized_pnl     numeric(14,4),
  position_count     integer,
  created_at         timestamptz  not null default now(),
  unique (user_id, snapshot_date)
);

alter table public.portfolio_snapshots enable row level security;

create policy "Users can view their own snapshots"
  on public.portfolio_snapshots for select
  using (auth.uid() = user_id);

create policy "Users can insert their own snapshots"
  on public.portfolio_snapshots for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own snapshots"
  on public.portfolio_snapshots for update
  using (auth.uid() = user_id);

create policy "Users can delete their own snapshots"
  on public.portfolio_snapshots for delete
  using (auth.uid() = user_id);

create index portfolio_snapshots_user_date_idx on public.portfolio_snapshots(user_id, snapshot_date desc);
