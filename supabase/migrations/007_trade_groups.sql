-- ─────────────────────────────────────────────
-- TRADE GROUPS
-- Allows multi-leg option positions (spreads, condors, etc.)
-- to be grouped so aggregate P&L can be tracked per position.
-- Mirrors the wheel_cycles → trades pattern.
-- ─────────────────────────────────────────────

create table public.trade_groups (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  label      text        not null,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add group_id to trades; deleting a group nullifies the FK on legs (legs are never deleted)
alter table public.trades
  add column if not exists group_id uuid references public.trade_groups(id) on delete set null;

-- Indexes
create index trade_groups_user_id_idx on public.trade_groups(user_id);
create index trades_group_id_idx      on public.trades(group_id);

-- Auto-update updated_at (reuses handle_updated_at() from migration 001)
create trigger trade_groups_updated_at
  before update on public.trade_groups
  for each row execute procedure public.handle_updated_at();

-- RLS
alter table public.trade_groups enable row level security;

create policy "Users can view their own trade groups"
  on public.trade_groups for select
  using (auth.uid() = user_id);

create policy "Users can insert their own trade groups"
  on public.trade_groups for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own trade groups"
  on public.trade_groups for update
  using (auth.uid() = user_id);

create policy "Users can delete their own trade groups"
  on public.trade_groups for delete
  using (auth.uid() = user_id);
