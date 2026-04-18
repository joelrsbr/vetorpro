UPDATE public.market_history SET periodicidade = 'anual_12m'
  WHERE key IN ('rate_ipca', 'rate_selic', 'rate_cdi', 'rate_igpm');