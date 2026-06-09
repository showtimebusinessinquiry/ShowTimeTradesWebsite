-- SHTJ Seed Data
-- ─────────────────────────────────────────────
-- IMPORTANT: Replace '00000000-0000-0000-0000-000000000000' with a real
-- user UUID from auth.users after creating a test account.
-- Run: select id from auth.users limit 1;
-- ─────────────────────────────────────────────

do $$
declare
  test_user_id uuid := '00000000-0000-0000-0000-000000000000';
begin

-- Trades (mix of options + equity, wins + losses)
insert into public.trades
  (user_id, date, ticker, asset_type, strategy, entry_price, exit_price, quantity, pnl, pnl_pct, strike, expiration, delta, dte, notes)
values
  (test_user_id, current_date - 20, 'SPY',  'option', 'iron_condor',   2.45, 0.80, 1,  165.00,  67.35, 450.00, current_date - 1, -0.12, 21, 'Sold 445/440 - 455/460 IC. Closed at 33% profit target.'),
  (test_user_id, current_date - 15, 'NQ',   'equity', 'equity_long',   15840, 15980, 1, 620.00,  3.91,  null,  null,             null,  null, 'Long NQ futures intraday. Clean breakout above VWAP.'),
  (test_user_id, current_date - 12, 'TSLA', 'option', 'debit_spread',  3.20, 1.80, 1, -140.00, -43.75, 200.00, current_date + 7, 0.38, 14, 'Debit call spread into earnings. IV crush hurt.'),
  (test_user_id, current_date - 8,  'QQQ',  'option', 'csp',           1.85, 0.40, 1,  145.00,  78.38, 360.00, current_date + 28, -0.18, 35, 'Cash secured put. Closed at 78% profit target.'),
  (test_user_id, current_date - 3,  'AAPL', 'option', 'covered_call',  0.95, 0.10, 2,  170.00,  89.47, 195.00, current_date + 6, 0.22, 7,  'Covered call against existing AAPL shares. Near expiry close.');

-- Portfolio positions
insert into public.portfolio_positions
  (user_id, ticker, asset_type, entry_price, current_price, quantity, notes)
values
  (test_user_id, 'NVDA', 'equity', 485.20, 924.60, 10, 'Core AI position. Long term hold.'),
  (test_user_id, 'SPY',  'equity', 420.00, 552.14, 5,  'Index exposure. Hedge anchor.'),
  (test_user_id, 'GLD',  'equity', 185.00, 218.40, 8,  'Macro hedge. Target 5% allocation.');

-- Watchlist
insert into public.watchlist
  (user_id, ticker, notes, price_target, current_price, is_flagged)
values
  (test_user_id, 'MSFT', 'Breakout above 420 confirmed. Watching for earnings vol play on calls.', 440.00, 418.75, true),
  (test_user_id, 'AMZN', 'AWS reacceleration thesis. Waiting for pullback to 180 to enter.', 215.00, 187.44, false),
  (test_user_id, 'COIN', 'BTC correlation play. High beta. Only enter on BTC strength confirmation.', 290.00, 225.30, false),
  (test_user_id, 'VIX',  'Spike above 20 = hedge trigger. Add puts or reduce delta exposure.', 20.00, 14.32, true);

end $$;
