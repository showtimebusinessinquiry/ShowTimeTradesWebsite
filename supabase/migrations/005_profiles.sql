-- ─────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────
create table public.profiles (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    uuid        not null unique references auth.users(id) on delete cascade,
  username   text        not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- All authenticated users can read profiles (leaderboard, username display)
create policy "Authenticated users can read all profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can only insert/update their own profile
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- Auto-create profile on signup
-- SECURITY DEFINER bypasses RLS (required before email confirmation creates a session)
-- ─────────────────────────────────────────────
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
    coalesce(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────
-- Leaderboard: allow authenticated users to read all trades
-- ─────────────────────────────────────────────
create policy "leaderboard_read_trades"
  on public.trades for select
  to authenticated
  using (true);

-- ─────────────────────────────────────────────
-- Index
-- ─────────────────────────────────────────────
create index profiles_user_id_idx on public.profiles(user_id);
create index profiles_username_idx on public.profiles(username);
