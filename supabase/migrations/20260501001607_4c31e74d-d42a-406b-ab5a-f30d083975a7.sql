ALTER TABLE public.simulations ALTER COLUMN interest_rate TYPE numeric(8,4);
ALTER TABLE public.simulations ALTER COLUMN property_value TYPE numeric(18,2);
ALTER TABLE public.simulations ALTER COLUMN down_payment TYPE numeric(18,2);
ALTER TABLE public.simulations ALTER COLUMN monthly_payment TYPE numeric(18,2);
ALTER TABLE public.simulations ALTER COLUMN total_interest TYPE numeric(18,2);
ALTER TABLE public.simulations ALTER COLUMN total_paid TYPE numeric(18,2);
ALTER TABLE public.simulations ALTER COLUMN extra_amortization TYPE numeric(18,2);
ALTER TABLE public.simulations ALTER COLUMN reinforcement_value TYPE numeric(18,2);