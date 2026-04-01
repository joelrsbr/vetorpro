
CREATE OR REPLACE FUNCTION public.check_and_reset_limits(p_user_id uuid)
 RETURNS TABLE(can_simulate boolean, can_generate_proposal boolean, simulations_remaining integer, proposals_remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    
    SELECT s.plan::text INTO v_plan
    FROM subscriptions s
    WHERE s.user_id = p_user_id AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > now())
    LIMIT 1;
    
    IF v_plan = 'business' THEN
        v_sim_limit := 2000;
        v_prop_limit := 300;
    ELSIF v_plan = 'pro' THEN
        v_sim_limit := 500;
        v_prop_limit := 100;
    ELSE
        v_sim_limit := 50;
        v_prop_limit := 20;
    END IF;
    
    RETURN QUERY SELECT 
        v_profile.simulations_used < v_sim_limit,
        v_profile.proposals_used < v_prop_limit,
        GREATEST(0, v_sim_limit - v_profile.simulations_used),
        GREATEST(0, v_prop_limit - v_profile.proposals_used);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_counts(p_user_id uuid)
 RETURNS TABLE(simulations_count integer, proposals_count integer, plan_limit integer, current_plan text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_plan text;
    v_limit integer;
BEGIN
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT s.plan::text INTO v_plan
    FROM subscriptions s
    WHERE s.user_id = p_user_id AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > now())
    LIMIT 1;

    IF v_plan = 'business' THEN v_limit := 2000;
    ELSIF v_plan = 'pro' THEN v_limit := 500;
    ELSE v_limit := 50;
    END IF;

    RETURN QUERY
    SELECT
        (SELECT count(*)::integer FROM simulations sim WHERE sim.user_id = p_user_id),
        (SELECT count(*)::integer FROM proposals prop WHERE prop.user_id = p_user_id),
        v_limit,
        COALESCE(v_plan, 'basic');
END;
$function$;
