-- ─────────────────────────────────────────────
-- FEEDBACK: admin reply columns
-- ─────────────────────────────────────────────

alter table public.feedback
  add column if not exists admin_response text,
  add column if not exists responded_at   timestamptz;
