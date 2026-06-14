-- Migration 015: Audit fixes
-- Addresses: CASCADE on trade_exits FK, trade_exits RLS ownership check on INSERT,
--            watchlist UPDATE RLS WITH CHECK (defensive re-apply), handle_new_user
--            OAuth fallback, show_on_leaderboard column, leaderboard_trades view.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add ON DELETE CASCADE to trade_exits.trade_id FK
--
--    014_trade_exits.sql created the FK inline without naming it, so Postgres
--    assigned the default name trade_exits_trade_id_fkey. Drop and re-add with
--    an explicit name and CASCADE so parent-trade deletes clean up exit rows.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.trade_exits
  DROP CONSTRAINT IF EXISTS trade_exits_trade_id_fkey,
  ADD CONSTRAINT trade_exits_trade_id_fkey
    FOREIGN KEY (trade_id) REFERENCES public.trades(id) ON DELETE CASCADE;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Fix trade_exits RLS — per-operation policies with trade ownership check
--
--    The previous "FOR ALL USING (auth.uid() = user_id)" policy allowed any
--    authenticated user to INSERT an exit row for a trade_id they don't own, as
--    long as they set user_id to themselves. The new INSERT policy adds an EXISTS
--    sub-select to verify the referenced trade belongs to the same user.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users own their exits" ON public.trade_exits;

-- Users can see their own exits
CREATE POLICY "trade_exits_select" ON public.trade_exits
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert exits for trades they own
CREATE POLICY "trade_exits_insert" ON public.trade_exits
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.trades
      WHERE trades.id = trade_id AND trades.user_id = auth.uid()
    )
  );

-- Users can only update their own exits
CREATE POLICY "trade_exits_update" ON public.trade_exits
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own exits
CREATE POLICY "trade_exits_delete" ON public.trade_exits
  FOR DELETE USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Fix watchlist UPDATE RLS — defensive re-apply of WITH CHECK
--
--    002_rls_policies.sql already includes WITH CHECK on this policy, but it was
--    not touched by 012_security_hardening.sql. Re-dropping and recreating here
--    keeps the record of intent clear and ensures the policy is correct even if
--    it was ever replaced by a version missing WITH CHECK.
--    Policy name matches 002_rls_policies.sql exactly.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can update own watchlist items" ON public.watchlist;

CREATE POLICY "Users can update own watchlist items" ON public.watchlist
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Fix handle_new_user — add username fallback for OAuth users
--
--    012_security_hardening.sql replaced the trigger function but used a direct
--    dereference of raw_user_meta_data->>'username', which returns NULL for OAuth
--    providers (Google, GitHub, etc.) that don't supply that key. This causes the
--    INSERT to fail or produce a NULL username, violating the NOT NULL constraint.
--
--    Fix: wrap with COALESCE(..., split_part(new.email, '@', 1)) so OAuth signups
--    get their email local-part as a username.
--
--    The profiles table has columns: user_id, username (no display_name column).
--    The trigger name on_auth_user_created is preserved from 005_profiles.sql.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (
    new.id,
    COALESCE(
      NULLIF(lower(trim(new.raw_user_meta_data->>'username')), ''),
      split_part(new.email, '@', 1)
    )
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Add show_on_leaderboard column to profiles
--
--    Controls opt-in visibility. Defaults to false so no existing user is
--    exposed on the leaderboard without explicit consent.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS show_on_leaderboard boolean NOT NULL DEFAULT false;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Replace leaderboard_read_trades policy with a restricted view
--
--    The "leaderboard_read_trades" policy from 005_profiles.sql granted all
--    authenticated users SELECT on every column of every trade row (USING true).
--    This is overly broad: it exposes notes, entry_price, quantity, and other
--    sensitive columns for all users to all users.
--
--    Replace it with a view that:
--      - only surfaces the columns needed for leaderboard display
--      - only includes rows for users who have opted in via show_on_leaderboard
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "leaderboard_read_trades" ON public.trades;

CREATE OR REPLACE VIEW public.leaderboard_trades AS
  SELECT t.id, t.user_id, t.date, t.ticker, t.strategy, t.pnl
  FROM public.trades t
  JOIN public.profiles p ON p.user_id = t.user_id
  WHERE p.show_on_leaderboard = true;

GRANT SELECT ON public.leaderboard_trades TO authenticated;
