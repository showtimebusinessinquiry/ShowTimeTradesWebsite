-- ─────────────────────────────────────────────
-- RLS POLICIES: trades
-- ─────────────────────────────────────────────
create policy "Users can view own trades"
  on public.trades for select
  using (auth.uid() = user_id);

create policy "Users can insert own trades"
  on public.trades for insert
  with check (auth.uid() = user_id);

create policy "Users can update own trades"
  on public.trades for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own trades"
  on public.trades for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- RLS POLICIES: portfolio_positions
-- ─────────────────────────────────────────────
create policy "Users can view own positions"
  on public.portfolio_positions for select
  using (auth.uid() = user_id);

create policy "Users can insert own positions"
  on public.portfolio_positions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own positions"
  on public.portfolio_positions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own positions"
  on public.portfolio_positions for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- RLS POLICIES: watchlist
-- ─────────────────────────────────────────────
create policy "Users can view own watchlist"
  on public.watchlist for select
  using (auth.uid() = user_id);

create policy "Users can insert own watchlist items"
  on public.watchlist for insert
  with check (auth.uid() = user_id);

create policy "Users can update own watchlist items"
  on public.watchlist for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own watchlist items"
  on public.watchlist for delete
  using (auth.uid() = user_id);
