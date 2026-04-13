
-- Create market_cache table for persisting market data
CREATE TABLE public.market_cache (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    source TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.market_cache ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read cache
CREATE POLICY "Authenticated users can read market cache"
ON public.market_cache
FOR SELECT
TO authenticated
USING (true);

-- Block anonymous access
CREATE POLICY "Block anonymous access on market_cache"
ON public.market_cache
FOR ALL
TO anon
USING (false);

-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
