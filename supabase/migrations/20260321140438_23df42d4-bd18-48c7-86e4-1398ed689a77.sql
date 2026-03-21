
CREATE OR REPLACE FUNCTION public.check_and_reset_limits(p_user_id uuid)
 RETURNS TABLE(can_simulate boolean, can_generate_proposal boolean, simulations_remaining integer, proposals_remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    
    -- Pro and Business: unlimited
    IF v_profile.subscription_plan = 'pro' THEN
        v_sim_limit := 999999;
        v_prop_limit := 999999;
    ELSE
        -- Basic plan: 10 simulations, 10 proposals
        v_sim_limit := 10;
        v_prop_limit := 10;
    END IF;
    
    RETURN QUERY SELECT 
        v_profile.simulations_used < v_sim_limit,
        v_profile.proposals_used < v_prop_limit,
        GREATEST(0, v_sim_limit - v_profile.simulations_used),
        GREATEST(0, v_prop_limit - v_profile.proposals_used);
END;
$function$;
