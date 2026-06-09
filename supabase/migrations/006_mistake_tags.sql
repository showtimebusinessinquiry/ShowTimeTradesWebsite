-- ─────────────────────────────────────────────
-- Add mistake_tags column to trades
-- Run this in the Supabase SQL editor
-- ─────────────────────────────────────────────
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS mistake_tags TEXT[] DEFAULT '{}';
