
-- Add CRM columns to proposals
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS ultima_interacao timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS client_phone text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS client_email text DEFAULT NULL;

-- Backfill existing rows: set ultima_interacao = created_at
UPDATE public.proposals SET ultima_interacao = created_at WHERE ultima_interacao IS NULL;
