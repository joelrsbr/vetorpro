DROP POLICY IF EXISTS "Users can update own proposals" ON public.proposals;

CREATE POLICY "Users can update own proposals"
ON public.proposals
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);