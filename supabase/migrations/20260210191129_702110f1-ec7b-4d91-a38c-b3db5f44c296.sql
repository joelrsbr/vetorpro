
-- Block anonymous access on profiles
CREATE POLICY "Block anonymous access on profiles"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Block anonymous access on simulations
CREATE POLICY "Block anonymous access on simulations"
ON public.simulations
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Block anonymous access on proposals
CREATE POLICY "Block anonymous access on proposals"
ON public.proposals
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Block anonymous access on subscriptions
CREATE POLICY "Block anonymous access on subscriptions"
ON public.subscriptions
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);
