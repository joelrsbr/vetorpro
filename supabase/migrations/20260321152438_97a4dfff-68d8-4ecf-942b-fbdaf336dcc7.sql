
-- Add status column to proposals for CRM semaphore
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'potential';

-- Update check_and_reset_limits with new plan quotas
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
    
    -- Reset monthly counters if needed
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
    
    -- Get active subscription plan
    SELECT s.plan::text INTO v_plan
    FROM subscriptions s
    WHERE s.user_id = p_user_id AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > now())
    LIMIT 1;
    
    -- Set limits based on plan
    IF v_plan = 'business' THEN
        v_sim_limit := 200;
        v_prop_limit := 200;
    ELSIF v_plan = 'pro' THEN
        v_sim_limit := 100;
        v_prop_limit := 100;
    ELSE
        -- Basic plan: 10/10
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

-- LGPD: Create function to clean up old records (30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    DELETE FROM public.simulations WHERE created_at < now() - interval '30 days';
    DELETE FROM public.proposals WHERE created_at < now() - interval '30 days';
END;
$function$;

-- Enable pg_cron and pg_net for scheduled cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
