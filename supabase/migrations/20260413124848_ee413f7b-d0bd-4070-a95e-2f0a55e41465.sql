
ALTER TABLE public.market_cache
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ok',
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'index';
