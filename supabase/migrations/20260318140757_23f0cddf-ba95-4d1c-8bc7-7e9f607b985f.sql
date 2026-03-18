
-- 1. Fix increment_simulation_count: enforce caller = owner
CREATE OR REPLACE FUNCTION public.increment_simulation_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    UPDATE profiles 
    SET simulations_used = simulations_used + 1
    WHERE user_id = p_user_id;
END;
$$;

-- 2. Fix check_and_reset_limits: enforce caller = owner
CREATE OR REPLACE FUNCTION public.check_and_reset_limits(p_user_id uuid)
RETURNS TABLE(can_simulate boolean, can_generate_proposal boolean, simulations_remaining integer, proposals_remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_profile profiles%ROWTYPE;
    v_sim_limit INTEGER;
    v_prop_limit INTEGER;
BEGIN
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id;
    
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
    
    IF v_profile.subscription_plan = 'pro' THEN
        v_sim_limit := 999999;
        v_prop_limit := 999999;
    ELSE
        v_sim_limit := 10;
        v_prop_limit := 2;
    END IF;
    
    RETURN QUERY SELECT 
        v_profile.simulations_used < v_sim_limit,
        v_profile.proposals_used < v_prop_limit,
        GREATEST(0, v_sim_limit - v_profile.simulations_used),
        GREATEST(0, v_prop_limit - v_profile.proposals_used);
END;
$$;

-- 3. Fix get_user_subscription: enforce caller = owner
CREATE OR REPLACE FUNCTION public.get_user_subscription(p_user_id uuid)
RETURNS TABLE(plan subscription_plan_v2, status subscription_status, is_active boolean, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT 
        s.plan,
        s.status,
        (s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > now())) AS is_active,
        s.expires_at
    FROM public.subscriptions s
    WHERE s.user_id = p_user_id;
END;
$$;
