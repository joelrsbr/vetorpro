
-- Create a secure RPC function for atomic proposal credit deduction
-- This uses service-level access to safely increment the counter
CREATE OR REPLACE FUNCTION public.increment_proposal_count(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    UPDATE profiles 
    SET proposals_used = proposals_used + 1
    WHERE user_id = p_user_id;
END;
$$;
