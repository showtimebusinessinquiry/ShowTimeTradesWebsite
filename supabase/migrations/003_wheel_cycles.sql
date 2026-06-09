-- ─────────────────────────────────────────────
-- WHEEL CYCLES
-- ─────────────────────────────────────────────
create table public.wheel_cycles (
  id                uuid          primary key default uuid_generate_v4(),
  user_id           uuid          not null references auth.users(id) on delete cascade,
  ticker            text          not null,
  status            text          not null default 'ACTIVE'
                    check (status in ('ACTIVE', 'COMPLETED', 'ABANDONED')),
  start_date        date          not null,
  end_date          date,
  -- Populated when CSP is assigned (shares acquired)
  shares_quantity   integer,
  shares_cost_basis numeric(12,4),
  -- Populated when CC is assigned (shares called away)
  shares_exit_price numeric(12,4),
  notes             text,
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now()
);

-- Add cycle_id to trades (nullable FK, no cascade delete of trades)
alter table public.trades
  add column if not exists cycle_id uuid references public.wheel_cycles(id) on delete set null;

-- Add cycle_id to portfolio_positions
alter table public.portfolio_positions
  add column if not exists cycle_id uuid references public.wheel_cycles(id) on delete set null;

-- Indexes
create index wheel_cycles_user_id_idx         on public.wheel_cycles(user_id);
create index wheel_cycles_user_status_idx     on public.wheel_cycles(user_id, status);
create index trades_cycle_id_idx              on public.trades(cycle_id);
create index portfolio_positions_cycle_id_idx on public.portfolio_positions(cycle_id);

-- updated_at trigger
create trigger wheel_cycles_updated_at
  before update on public.wheel_cycles
  for each row execute procedure public.handle_updated_at();

-- RLS
alter table public.wheel_cycles enable row level security;

create policy "Users can view their own wheel cycles"
  on public.wheel_cycles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own wheel cycles"
  on public.wheel_cycles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own wheel cycles"
  on public.wheel_cycles for update
  using (auth.uid() = user_id);

create policy "Users can delete their own wheel cycles"
  on public.wheel_cycles for delete
  using (auth.uid() = user_id);
