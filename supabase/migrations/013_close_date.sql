-- Add close_date to trades for holding period calculation
ALTER TABLE trades ADD COLUMN IF NOT EXISTS close_date date;
