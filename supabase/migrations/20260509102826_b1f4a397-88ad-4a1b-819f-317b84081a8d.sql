ALTER TABLE public.simulations
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'potential';

ALTER TABLE public.simulations
DROP CONSTRAINT IF EXISTS simulations_status_check;

ALTER TABLE public.simulations
ADD CONSTRAINT simulations_status_check
CHECK (status IN ('potential', 'negotiating', 'closed', 'lost', 'archived'));

UPDATE public.simulations s
SET status = p.status
FROM public.proposals p
WHERE p.simulation_id = s.id
  AND p.status IN ('potential', 'negotiating', 'closed', 'lost', 'archived');