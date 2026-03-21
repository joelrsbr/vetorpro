
-- Drop the existing broad UPDATE policy
DROP POLICY IF EXISTS "Users can update own profile safe" ON public.profiles;

-- Create a restricted UPDATE policy that only allows safe columns
-- Uses a BEFORE UPDATE trigger to revert sensitive fields
CREATE OR REPLACE FUNCTION public.protect_profile_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Always revert usage counters and plan to their original values
    -- Only SECURITY DEFINER RPCs (running as service_role) can change these
    IF current_setting('role') != 'service_role' THEN
        NEW.simulations_used := OLD.simulations_used;
        NEW.proposals_used := OLD.proposals_used;
        NEW.simulations_reset_at := OLD.simulations_reset_at;
        NEW.proposals_reset_at := OLD.proposals_reset_at;
        NEW.subscription_plan := OLD.subscription_plan;
    END IF;
    RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS protect_profile_counters_trigger ON public.profiles;
CREATE TRIGGER protect_profile_counters_trigger
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_counters();

-- Re-create the UPDATE policy (same scope, trigger handles column protection)
CREATE POLICY "Users can update own profile safe"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
