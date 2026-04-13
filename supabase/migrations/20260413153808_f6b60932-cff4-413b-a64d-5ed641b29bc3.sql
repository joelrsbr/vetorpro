
-- Add new columns
ALTER TABLE public.market_cache
  ADD COLUMN IF NOT EXISTS display_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'outros',
  ADD COLUMN IF NOT EXISTS plan_level text NOT NULL DEFAULT 'basic';

-- Populate existing rows
UPDATE public.market_cache SET
  display_name = 'Selic',
  description = 'Taxa básica de juros da economia brasileira, definida pelo Copom/Banco Central.',
  category = 'juros',
  plan_level = 'basic'
WHERE key = 'rate_selic';

UPDATE public.market_cache SET
  display_name = 'IPCA',
  description = 'Índice oficial de inflação do Brasil, medido pelo IBGE.',
  category = 'inflação',
  plan_level = 'basic'
WHERE key = 'rate_ipca';

UPDATE public.market_cache SET
  display_name = 'IGP-M',
  description = 'Índice Geral de Preços do Mercado, usado em reajustes de aluguéis.',
  category = 'inflação',
  plan_level = 'basic'
WHERE key = 'rate_igpm';

UPDATE public.market_cache SET
  display_name = 'INCC',
  description = 'Índice Nacional de Custo da Construção, referência para obras e imóveis na planta.',
  category = 'inflação',
  plan_level = 'basic'
WHERE key = 'rate_incc';

UPDATE public.market_cache SET
  display_name = 'TR',
  description = 'Taxa Referencial, utilizada no cálculo de rendimentos da poupança e financiamentos.',
  category = 'juros',
  plan_level = 'basic'
WHERE key = 'rate_tr';

UPDATE public.market_cache SET
  display_name = 'CDI',
  description = 'Certificado de Depósito Interbancário, referência para investimentos de renda fixa.',
  category = 'juros',
  plan_level = 'basic'
WHERE key = 'rate_cdi';

UPDATE public.market_cache SET
  display_name = 'Poupança',
  description = 'Rendimento mensal da caderneta de poupança.',
  category = 'juros',
  plan_level = 'basic'
WHERE key = 'rate_poupanca';

UPDATE public.market_cache SET
  display_name = 'USD/BRL',
  description = 'Cotação do dólar americano frente ao real brasileiro.',
  category = 'câmbio',
  plan_level = 'pro'
WHERE key = 'currency_usd';

UPDATE public.market_cache SET
  display_name = 'EUR/BRL',
  description = 'Cotação do euro frente ao real brasileiro.',
  category = 'câmbio',
  plan_level = 'pro'
WHERE key = 'currency_eur';

UPDATE public.market_cache SET
  display_name = 'Bitcoin',
  description = 'Preço do Bitcoin em reais, principal criptomoeda do mercado.',
  category = 'cripto',
  plan_level = 'business'
WHERE key = 'crypto_btc';
