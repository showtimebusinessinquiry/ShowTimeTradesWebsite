-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- TRADES
-- ─────────────────────────────────────────────
create table public.trades (
  id           uuid          primary key default uuid_generate_v4(),
  user_id      uuid          not null references auth.users(id) on delete cascade,
  date         date          not null,
  ticker       text          not null,
  asset_type   text          not null check (asset_type in ('option', 'equity')),
  strategy     text          not null,
  entry_price  numeric(12,4) not null,
  exit_price   numeric(12,4),
  quantity     numeric(12,4) not null default 1,
  pnl          numeric(12,2),
  pnl_pct      numeric(8,4),
  -- Options-specific (null for equities)
  strike       numeric(12,4),
  expiration   date,
  delta        numeric(6,4),
  dte          integer,
  notes        text,
  created_at   timestamptz   not null default now(),
  updated_at   timestamptz   not null default now()
);

-- ─────────────────────────────────────────────
-- PORTFOLIO POSITIONS
-- ─────────────────────────────────────────────
create table public.portfolio_positions (
  id            uuid          primary key default uuid_generate_v4(),
  user_id       uuid          not null references auth.users(id) on delete cascade,
  ticker        text          not null,
  asset_type    text          not null check (asset_type in ('option', 'equity')),
  entry_price   numeric(12,4) not null,
  current_price numeric(12,4),
  quantity      numeric(12,4) not null default 1,
  notes         text,
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now()
);

-- ─────────────────────────────────────────────
-- WATCHLIST
-- ─────────────────────────────────────────────
create table public.watchlist (
  id            uuid          primary key default uuid_generate_v4(),
  user_id       uuid          not null references auth.users(id) on delete cascade,
  ticker        text          not null,
  notes         text,
  price_target  numeric(12,4),
  current_price numeric(12,4),
  is_flagged    boolean       not null default false,
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now()
);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY — enable on all tables
-- ─────────────────────────────────────────────
alter table public.trades              enable row level security;
alter table public.portfolio_positions enable row level security;
alter table public.watchlist           enable row level security;

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
create index trades_user_id_idx              on public.trades(user_id);
create index trades_date_idx                 on public.trades(date);
create index trades_user_date_idx            on public.trades(user_id, date desc);
create index portfolio_user_id_idx           on public.portfolio_positions(user_id);
create index watchlist_user_id_idx           on public.watchlist(user_id);

-- ─────────────────────────────────────────────
-- updated_at trigger function
-- ─────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trades_updated_at
  before update on public.trades
  for each row execute procedure public.handle_updated_at();

create trigger portfolio_updated_at
  before update on public.portfolio_positions
  for each row execute procedure public.handle_updated_at();

create trigger watchlist_updated_at
  before update on public.watchlist
  for each row execute procedure public.handle_updated_at();
