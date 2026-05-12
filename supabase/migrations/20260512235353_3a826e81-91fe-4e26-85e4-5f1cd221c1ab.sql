
-- 1. Fix profile counters trigger to allow internal SECURITY DEFINER RPCs
CREATE OR REPLACE FUNCTION public.protect_profile_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF current_setting('role') != 'service_role'
       AND COALESCE(current_setting('app.internal_call', true), 'false') != 'true' THEN
        NEW.simulations_used := OLD.simulations_used;
        NEW.proposals_used := OLD.proposals_used;
        NEW.simulations_reset_at := OLD.simulations_reset_at;
        NEW.proposals_reset_at := OLD.proposals_reset_at;
        NEW.subscription_plan := OLD.subscription_plan;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_proposal_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    PERFORM set_config('app.internal_call', 'true', true);
    UPDATE profiles SET proposals_used = proposals_used + 1 WHERE user_id = p_user_id;
    PERFORM set_config('app.internal_call', 'false', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_simulation_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    PERFORM set_config('app.internal_call', 'true', true);
    UPDATE profiles SET simulations_used = simulations_used + 1 WHERE user_id = p_user_id;
    PERFORM set_config('app.internal_call', 'false', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_and_reset_limits(p_user_id uuid)
RETURNS TABLE(can_simulate boolean, can_generate_proposal boolean, simulations_remaining integer, proposals_remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_profile profiles%ROWTYPE;
    v_plan text;
    v_sim_limit INTEGER;
    v_prop_limit INTEGER;
BEGIN
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id;

    PERFORM set_config('app.internal_call', 'true', true);

    IF v_profile.simulations_reset_at < date_trunc('month', now()) THEN
        UPDATE profiles
        SET simulations_used = 0, simulations_reset_at = now()
        WHERE user_id = p_user_id;
        v_profile.simulations_used := 0;
    END IF;

    IF v_profile.proposals_reset_at < date_trunc('month', now()) THEN
        UPDATE profiles
        SET proposals_used = 0, proposals_reset_at = now()
        WHERE user_id = p_user_id;
        v_profile.proposals_used := 0;
    END IF;

    PERFORM set_config('app.internal_call', 'false', true);

    SELECT s.plan::text INTO v_plan
    FROM subscriptions s
    WHERE s.user_id = p_user_id AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > now())
    LIMIT 1;

    IF v_plan = 'business' THEN
        v_sim_limit := 2000; v_prop_limit := 300;
    ELSIF v_plan = 'pro' THEN
        v_sim_limit := 300; v_prop_limit := 100;
    ELSE
        v_sim_limit := 50; v_prop_limit := 20;
    END IF;

    RETURN QUERY SELECT
        v_profile.simulations_used < v_sim_limit,
        v_profile.proposals_used < v_prop_limit,
        GREATEST(0, v_sim_limit - v_profile.simulations_used),
        GREATEST(0, v_prop_limit - v_profile.proposals_used);
END;
$$;

-- 2. Lock down cleanup_old_records
CREATE OR REPLACE FUNCTION public.cleanup_old_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    DELETE FROM public.simulations WHERE created_at < now() - interval '30 days';
    DELETE FROM public.proposals WHERE created_at < now() - interval '30 days';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_old_records() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_records() TO service_role;

-- 3. app_settings: restrict reads to authenticated users
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
CREATE POLICY "Authenticated users can read app settings"
ON public.app_settings FOR SELECT
TO authenticated
USING (true);

-- 4. user_roles: make anon block restrictive
DROP POLICY IF EXISTS "Block anonymous access on user_roles" ON public.user_roles;
CREATE POLICY "Block anonymous access on user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- 5. Revoke anon EXECUTE on internal SECURITY DEFINER helper functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_proposal_count(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_simulation_count(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_and_reset_limits(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_counts(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_subscription(uuid) FROM anon;
