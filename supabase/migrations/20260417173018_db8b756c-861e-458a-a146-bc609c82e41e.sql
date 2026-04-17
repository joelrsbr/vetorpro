-- 1. Estender market_history com novos campos
ALTER TABLE public.market_history
  ADD COLUMN IF NOT EXISTS unidade text NOT NULL DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS data_referencia date,
  ADD COLUMN IF NOT EXISTS insight text;

-- Índice para consultas de séries históricas
CREATE INDEX IF NOT EXISTS idx_market_history_key_date
  ON public.market_history (key, data_referencia DESC NULLS LAST, recorded_at DESC);

-- 2. Adicionar UF preferida no perfil do usuário
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS uf text NOT NULL DEFAULT 'RS';