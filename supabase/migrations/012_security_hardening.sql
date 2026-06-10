-- Migration 012: Security hardening
-- Addresses: C2 (admins policy), H1 (missing with check), H2 (search_path),
--            S3-S5 (entry_price/quantity/strategy constraints), S6 (leaderboard index)

-- C2: Restrict admins SELECT to own row only (was: all authenticated users could enumerate all admin UUIDs)
drop policy if exists "Authenticated users can read admins" on public.admins;
create policy "Admins can read own row"
  on public.admins for select
  to authenticated
  using (auth.uid() = user_id);

-- H1: Add missing WITH CHECK to UPDATE policies to prevent user_id reassignment attacks

-- profiles
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using    (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- wheel_cycles
drop policy if exists "Users can update their own wheel cycles" on public.wheel_cycles;
create policy "Users can update their own wheel cycles"
  on public.wheel_cycles for update
  to authenticated
  using    (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- trade_groups
drop policy if exists "Users can update their own trade groups" on public.trade_groups;
create policy "Users can update their own trade groups"
  on public.trade_groups for update
  to authenticated
  using    (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- watchlist_lists
drop policy if exists "Users can update their own watchlist lists" on public.watchlist_lists;
create policy "Users can update their own watchlist lists"
  on public.watchlist_lists for update
  to authenticated
  using    (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- portfolio_snapshots
drop policy if exists "Users can update their own snapshots" on public.portfolio_snapshots;
create policy "Users can update their own snapshots"
  on public.portfolio_snapshots for update
  to authenticated
  using    (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- H2/S2: Restore set search_path in handle_new_user (was dropped in migration 011)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, username)
  values (
    new.id,
    lower(trim(new.raw_user_meta_data->>'username'))
  )
  on conflict do nothing;
  return new;
end;
$$;

-- S3: Prevent zero/negative entry_price (division-by-zero in P&L % calculations)
-- NOT VALID: only enforces on new inserts/updates, doesn't fail on pre-existing rows
alter table public.trades
  add constraint trades_entry_price_positive check (entry_price > 0) not valid;

alter table public.portfolio_positions
  add constraint positions_entry_price_positive check (entry_price > 0) not valid;

-- S4: Prevent zero quantity (silent P&L = 0 corruption)
alter table public.trades
  add constraint trades_quantity_positive check (quantity > 0) not valid;

-- S5: Constrain strategy to known values (NOT VALID to protect existing data)
alter table public.trades
  add constraint trades_strategy_valid check (strategy in (
    'csp', 'csp_roll', 'covered_call', 'covered_call_roll', 'pmcc',
    'iron_condor', 'iron_butterfly', 'debit_spread', 'credit_spread',
    'call_debit_spread', 'put_debit_spread', 'call_credit_spread', 'put_credit_spread',
    'long_call', 'long_put', 'collar', 'calendar', 'strangle', 'straddle',
    'equity_long', 'equity_short', 'wheel', 'portfolio_close'
  )) not valid;

-- S6: Composite index for leaderboard aggregation
create index if not exists trades_user_pnl_idx on public.trades (user_id, pnl);
