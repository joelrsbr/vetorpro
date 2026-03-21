
-- RPC to get real-time dashboard counts for the authenticated user
CREATE OR REPLACE FUNCTION public.get_dashboard_counts(p_user_id uuid)
RETURNS TABLE(
    simulations_count integer,
    proposals_count integer,
    plan_limit integer,
    current_plan text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan text;
    v_limit integer;
BEGIN
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Get active plan
    SELECT s.plan::text INTO v_plan
    FROM subscriptions s
    WHERE s.user_id = p_user_id AND s.status = 'active'
    AND (s.expires_at IS NULL OR s.expires_at > now())
    LIMIT 1;

    -- Set limits
    IF v_plan = 'business' THEN v_limit := 200;
    ELSIF v_plan = 'pro' THEN v_limit := 100;
    ELSE v_limit := 10;
    END IF;

    RETURN QUERY
    SELECT
        (SELECT count(*)::integer FROM simulations sim WHERE sim.user_id = p_user_id),
        (SELECT count(*)::integer FROM proposals prop WHERE prop.user_id = p_user_id),
        v_limit,
        COALESCE(v_plan, 'basic');
END;
$$;
