CREATE TABLE trade_exits (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id   uuid NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exit_date  date NOT NULL,
  exit_price numeric(12,4) NOT NULL,
  quantity   integer NOT NULL CHECK (quantity > 0),
  pnl        numeric(12,4) NOT NULL,
  notes      text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trade_exits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their exits" ON trade_exits
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX trade_exits_trade_id_idx ON trade_exits(trade_id);
CREATE INDEX trade_exits_user_id_idx  ON trade_exits(user_id);
