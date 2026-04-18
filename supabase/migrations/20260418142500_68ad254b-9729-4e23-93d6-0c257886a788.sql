-- Create enum-like check via text + constraint
ALTER TABLE public.market_history
  ADD COLUMN IF NOT EXISTS periodicidade text NOT NULL DEFAULT 'mensal';

-- Validation trigger (avoid CHECK with immutable rules issues — keep simple here)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'market_history_periodicidade_check'
  ) THEN
    ALTER TABLE public.market_history
      ADD CONSTRAINT market_history_periodicidade_check
      CHECK (periodicidade IN ('mensal', 'anual_12m', 'diario'));
  END IF;
END $$;

-- Backfill por chave
UPDATE public.market_history SET periodicidade = 'anual_12m'
  WHERE key IN ('ipca', 'selic', 'cdi', 'igpm');

UPDATE public.market_history SET periodicidade = 'mensal'
  WHERE key = 'incc' OR key LIKE 'cub_%' OR key IN ('tr', 'poupanca');

UPDATE public.market_history SET periodicidade = 'diario'
  WHERE key LIKE 'currency_%' OR key LIKE 'crypto_%';

CREATE INDEX IF NOT EXISTS idx_market_history_key_periodicidade
  ON public.market_history (key, periodicidade, recorded_at DESC);