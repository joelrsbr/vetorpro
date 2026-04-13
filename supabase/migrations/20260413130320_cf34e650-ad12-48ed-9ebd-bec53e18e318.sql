
CREATE TABLE public.market_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL,
  value numeric NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_market_history_key_date ON public.market_history (key, recorded_at DESC);

ALTER TABLE public.market_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read market history"
  ON public.market_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Block anonymous access on market_history"
  ON public.market_history FOR ALL TO anon USING (false);
