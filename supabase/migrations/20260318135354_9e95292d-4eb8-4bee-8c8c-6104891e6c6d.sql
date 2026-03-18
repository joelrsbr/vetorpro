
-- 1. Remove INSERT policy on subscriptions (only triggers/service_role should insert)
DROP POLICY IF EXISTS "System can insert subscriptions" ON public.subscriptions;

-- 2. Remove UPDATE policy on subscriptions (only edge functions with service_role should update)
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;

-- 3. Add trigger on profiles to prevent subscription_plan changes from regular users
CREATE OR REPLACE FUNCTION public.protect_subscription_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    -- If subscription_plan is being changed, revert it to the old value
    -- Only service_role (used by edge functions/triggers) bypasses RLS and this trigger checks current_setting
    IF NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan THEN
        IF current_setting('role') != 'service_role' THEN
            NEW.subscription_plan := OLD.subscription_plan;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profiles_subscription_plan
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_subscription_plan();

-- 4. Add trigger on subscriptions to prevent direct plan/status changes from non-service_role
CREATE OR REPLACE FUNCTION public.protect_subscription_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    IF current_setting('role') != 'service_role' THEN
        -- Revert sensitive fields
        NEW.plan := OLD.plan;
        NEW.status := OLD.status;
        NEW.stripe_customer_id := OLD.stripe_customer_id;
        NEW.stripe_subscription_id := OLD.stripe_subscription_id;
        NEW.expires_at := OLD.expires_at;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER protect_subscriptions_fields
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.protect_subscription_fields();

-- 5. Re-add a limited UPDATE policy (allows update but triggers protect the fields)
CREATE POLICY "Users can update own subscription safe"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 6. Prevent direct INSERT into subscriptions from authenticated users (only trigger should create)
-- The handle_new_user_subscription trigger uses SECURITY DEFINER so it bypasses RLS
