
-- Remove the broad UPDATE policy on subscriptions entirely
-- The protect_subscription_fields trigger already guards, but RLS should block direct updates from authenticated users
DROP POLICY IF EXISTS "Users can update own subscription safe" ON public.subscriptions;

-- Remove the broad UPDATE policy on profiles and replace with column-restricted one
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create a restricted UPDATE policy for profiles that only allows safe columns
-- We use a BEFORE UPDATE trigger to protect subscription_plan, but let's also restrict via RLS
-- Since RLS can't restrict columns directly, we keep the trigger and add the policy back
-- but document that the trigger protects sensitive fields
CREATE POLICY "Users can update own profile safe"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
