-- ─────────────────────────────────────────────
-- USERNAME SECURITY: case-insensitive uniqueness
-- ─────────────────────────────────────────────

-- Drop the old case-sensitive unique constraint
alter table public.profiles drop constraint if exists profiles_username_key;

-- Add a case-insensitive unique index so "Alice" and "alice" are treated as the same
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

-- Update the trigger to enforce lowercase + trim at the DB level
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
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
